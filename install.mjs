#!/usr/bin/env node
/**
 * Put TinyFish's MCP server in charge of web access for a dsh profile, and take
 * the built-in web_search / web_fetch tools away from the `standard` preset.
 *
 * Everything is generated from the dsh installation on this machine, so the
 * preset override always matches the running dsh version.
 *
 *   node install.mjs --key sk-tinyfish-... [--profile web]
 *   node install.mjs --profile web --force     # after a dsh upgrade
 *   node install.mjs --profile web --revert    # remove the managed block
 */
import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const BEGIN = '# >>> dsh-tinyfish'
const END = '# <<< dsh-tinyfish'
const opt = { force: false, revert: false, profile: null, key: null }

for (let i = 0; i < process.argv.length - 2; i += 1) {
  const arg = process.argv[i + 2]
  if (arg === '--force' || arg === '-f') opt.force = true
  else if (arg === '--revert') opt.revert = true
  else if (arg === '--profile' || arg === '-p') opt.profile = process.argv[(i += 1) + 2]
  else if (arg === '--key' || arg === '-k') opt.key = process.argv[(i += 1) + 2]
  else if (arg === '--help' || arg === '-h') {
    console.log(usage())
    process.exit(0)
  } else die(`unknown argument: ${arg}\n\n${usage()}`)
}

function usage() {
  return [
    'usage: node install.mjs [--profile <name>] [--key <tinyfish-key>] [--force] [--revert]',
    '',
    '  --profile  dsh profile to patch (default: $DSH_PROFILE, else "web")',
    '  --key      TinyFish API key; written to $DSH_HOME/tinyfish.key (mode 600)',
    '  --force    regenerate the managed block, e.g. after a dsh upgrade',
    '  --revert   remove the managed block again',
  ].join('\n')
}

function die(message) {
  console.error(`dsh-tinyfish: ${message}`)
  process.exit(1)
}

const dshHome = process.env.DSH_HOME || join(process.env.HOME || '/root', '.dsh')
const profile = opt.profile || process.env.DSH_PROFILE || 'web'
const profileDir = opt.profile
  ? join(dshHome, 'profiles', opt.profile)
  : process.env.DSH_PROFILE_DIR || join(dshHome, 'profiles', profile)
const patchPath = join(profileDir, 'cordis.patch.yml')
const keyPath = join(dshHome, 'tinyfish.key')

let root
function dshInstallRoot() {
  if (root) return root
  if (process.env.DSH_INSTALL) return (root = process.env.DSH_INSTALL)
  let bin
  try {
    bin = execFileSync('bash', ['-lc', 'command -v dsh'], { encoding: 'utf8' }).trim()
  } catch {
    die('dsh is not on PATH; set DSH_INSTALL to the @deepseek-ai/dsh installation directory')
  }
  root = dirname(dirname(execFileSync('readlink', ['-f', bin], { encoding: 'utf8' }).trim()))
  return root
}

function loadYaml() {
  const require = createRequire(join(dshInstallRoot(), 'package.json'))
  return require('js-yaml')
}

function shippedPreset() {
  const require = createRequire(join(dshInstallRoot(), 'package.json'))
  let pkg
  try {
    pkg = require.resolve('@deepseek-ai/dsh-web-app/package.json')
  } catch {
    die('@deepseek-ai/dsh-web-app is not part of this dsh installation, so this profile has no standard preset to override')
  }
  const file = join(dirname(pkg), 'presets', 'standard.patch.yml')
  if (!existsSync(file)) die(`standard preset not found at ${file}`)
  return file
}

function dumpConfig() {
  try {
    return execFileSync('dsh', ['--profile', profile, '--dump-config'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000,
      env: { ...process.env, DSH_HOME: dshHome },
    })
  } catch (error) {
    die(`dsh --profile ${profile} --dump-config failed:\n${error.stderr || error.message}`)
  }
}

if (!existsSync(patchPath)) die(`no profile at ${profileDir} (is "${profile}" the right profile name?)`)

const original = readFileSync(patchPath, 'utf8')
const hasRegion = original.includes(BEGIN)

if (opt.revert) {
  if (!hasRegion) die('this profile has no managed dsh-tinyfish block')
  const stripped = withoutManagedRegion(original).replace(/\s*$/, '')
  writeFileSync(patchPath, (stripped.trim() === '' ? '[]' : stripped) + '\n')
  console.log('removed the dsh-tinyfish block from', patchPath)
  console.log('restart the app, then use a new session to see the built-in web tools again')
  process.exit(0)
}

if (hasRegion && !opt.force) {
  console.log('already installed (managed block present); use --force to regenerate it')
  process.exit(0)
}

if (!hasRegion && dumpConfig().includes('serverName: tinyfish')) {
  console.log('already installed (TinyFish MCP is mounted by another layer, e.g. a profile bundle)')
  process.exit(0)
}

const key = (opt.key || process.env.TINYFISH_API_KEY || '').trim()
if (key) {
  writeFileSync(keyPath, key + '\n', { mode: 0o600 })
  chmodSync(keyPath, 0o600)
  console.log('wrote TinyFish key to', keyPath)
} else if (!existsSync(keyPath)) {
  die('no TinyFish API key: pass --key sk-tinyfish-... (get one at https://agent.tinyfish.ai/api-keys)')
} else {
  console.log('reusing existing key file', keyPath)
}

// The shipped preset row, re-indented one level and without its tool-web entry.
const lines = readFileSync(shippedPreset(), 'utf8').split('\n')
const start = lines.findIndex((line) => line.trim() === '- id: preset-standard')
if (start < 0) die('preset-standard not found in the shipped preset file')
const rowIndent = lines[start].match(/^ */)[0].length
let end = start + 1
while (end < lines.length) {
  const line = lines[end]
  if (line.trim().startsWith('- ') && line.match(/^ */)[0].length === rowIndent) break
  end += 1
}
const body = lines.slice(start, end).map((line) =>
  line.startsWith(' '.repeat(rowIndent)) ? line.slice(rowIndent) : line.trim() === '' ? '' : line,
)
body.shift()
const toolWeb = body.findIndex((line) => line.trim() === '- id: tool-web')
if (toolWeb >= 0) {
  let stop = toolWeb + 1
  while (stop < body.length) {
    const line = body[stop]
    if (line.trim() !== '' && line.match(/^ */)[0].length <= 6) break
    stop += 1
  }
  body.splice(toolWeb, stop - toolWeb)
} else {
  console.log('note: this dsh version has no tool-web in the standard preset; only the MCP row will be added')
}

const authExpr = "(process.env.DSH_HOME || process.env.HOME + '/.dsh') + '/tinyfish.key'"
const region = [
  BEGIN,
  '# Managed block: `node install.mjs --force` regenerates it, `--revert` removes it.',
  '# 1. Mounts TinyFish over streamable HTTP. dsh has no interactive OAuth flow, so',
  '#    the connection authenticates with an API key read at activation time from',
  '#    $DSH_HOME/tinyfish.key (mode 600); the key never appears in this file.',
  '# 2. Replaces the shipped standard preset with the same plugin list minus',
  '#    tool-web, so new sessions get mcp__tinyfish__* instead of web_search.',
  '- insert:',
  '    - id: mcp-tinyfish',
  "      name: '@deepseek-ai/dsh-mcp-client'",
  '      config:',
  '        serverName: tinyfish',
  '        transport: streamable-http',
  '        url: https://agent.tinyfish.ai/mcp',
  '        toolCallTimeoutMs: 180000',
  '        failOnStartupError: true',
  '        headers:',
  `          Authorization: !!js "'Bearer ' + process.getBuiltinModule('node:fs').readFileSync(${authExpr}, 'utf8').trim()"`,
  '',
  '- id: preset-standard',
  ...body,
  END,
]

function withoutManagedRegion(text) {
  if (!text.includes(BEGIN)) return text
  return text.slice(0, text.indexOf(BEGIN)) + text.slice(text.indexOf(END) + END.length + 1)
}

function asPatchBody(text) {
  const bare = text.trim()
  if (bare === '' || bare === '[]' || bare === '---\n[]' || bare === '--- []') return ''
  return text.replace(/\s*$/, '\n') + '\n'
}

const withoutRegion = withoutManagedRegion(original)
const next = asPatchBody(withoutRegion) + region.join('\n') + '\n'
copyFileSync(patchPath, `${patchPath}.bak`)
writeFileSync(patchPath, next)

const yaml = loadYaml()
const jsTag = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  construct: (data) => ({ __jsExpr: data }),
  instanceOf: Object,
})
try {
  yaml.load(next, { schema: yaml.DEFAULT_SCHEMA.extend([jsTag]) })
} catch (error) {
  copyFileSync(`${patchPath}.bak`, patchPath)
  die(`generated patch does not parse, restored the backup:\n${error.message}`)
}

let dump = dumpConfig()
if (!dump.includes('serverName: tinyfish')) dump = dumpConfig()
const presetSection = (dump.match(/- id: preset-standard\n([\s\S]*?)(?=\n- id: |\n- insert: |\n*$)/) || [])[1] || ''
const plugins = (presetSection.match(/^ {6}- id: /gm) || []).length
console.log('patched', patchPath)
console.log('composed profile:', plugins, 'plugins in preset-standard,', /tool-web/.test(presetSection) ? 'tool-web STILL PRESENT' : 'tool-web removed')
console.log('TinyFish MCP row mounted:', dump.includes('serverName: tinyfish'))
console.log('\nNext: restart the app, open a NEW session, then confirm it has mcp__tinyfish__search and no web_search.')
