#!/usr/bin/env node
/**
 * Put TinyFish's MCP server in charge of web access for a dsh profile, and take
 * the built-in web_search / web_fetch tools away from every agent preset that
 * ships them.
 *
 * Everything is generated from the dsh installation on this machine, so the
 * preset overrides always match the running dsh version.
 *
 *   node install.mjs --key sk-tinyfish-... [--profile web]
 *   node install.mjs --profile web --presets standard,cordis
 *   node install.mjs --profile web --force     # after a dsh upgrade
 *   node install.mjs --profile web --revert    # remove the managed block
 */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const BEGIN = '# >>> dsh-tinyfish'
const END = '# <<< dsh-tinyfish'
// Every managed block, including the per-preset blocks older versions wrote.
const REGION = /^# >>> dsh-tinyfish[^\n]*\n[\s\S]*?^# <<< dsh-tinyfish[^\n]*\n?/gm
const opt = { force: false, revert: false, profile: null, key: null, presets: null }

for (let i = 0; i < process.argv.length - 2; i += 1) {
  const arg = process.argv[i + 2]
  if (arg === '--force' || arg === '-f') opt.force = true
  else if (arg === '--revert') opt.revert = true
  else if (arg === '--profile' || arg === '-p') opt.profile = process.argv[(i += 1) + 2]
  else if (arg === '--key' || arg === '-k') opt.key = process.argv[(i += 1) + 2]
  else if (arg === '--presets') opt.presets = process.argv[(i += 1) + 2]
  else if (arg === '--help' || arg === '-h') {
    console.log(usage())
    process.exit(0)
  } else die(`unknown argument: ${arg}\n\n${usage()}`)
}

function usage() {
  return [
    'usage: node install.mjs [--profile <name>] [--key <tinyfish-key>] [--presets a,b] [--force] [--revert]',
    '',
    '  --profile  dsh profile to patch (default: $DSH_PROFILE, else "web")',
    '  --key      TinyFish API key; written to $DSH_HOME/tinyfish.key (mode 600)',
    '  --presets  presets to override (default: every shipped preset that has tool-web)',
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

// ---------------------------------------------------------------------------
// Locate the real dsh installation.
//
// `dsh` on PATH is often a launcher shim (the dsh-go app ships one, and some
// package-manager setups do too), so dirname(dirname(realpath(bin))) can point
// at /usr/local instead of the install. Read the launcher and use the dsh entry
// point it actually runs, then verify each candidate before trusting it.
// ---------------------------------------------------------------------------

let root
function dshInstallRoot() {
  if (root) return root
  const candidates = []
  if (process.env.DSH_INSTALL) candidates.push(process.env.DSH_INSTALL)
  let bin = null
  try {
    bin = execFileSync('bash', ['-lc', 'command -v dsh'], { encoding: 'utf8' }).trim()
  } catch {
    bin = null
  }
  if (bin) {
    let real = bin
    try {
      real = realpathSync(bin)
    } catch {
      /* keep the unresolved path */
    }
    candidates.push(dirname(dirname(real)))
    try {
      const text = readFileSync(real, 'utf8')
      for (const match of text.matchAll(/(\/[^'"\s;]*?)\/node_modules\/@deepseek-ai\/dsh\/lib\/bin\.js/g)) {
        candidates.push(match[1])
      }
    } catch {
      /* not a readable launcher */
    }
  }
  for (const candidate of [...new Set(candidates)]) {
    try {
      createRequire(join(candidate, 'package.json')).resolve('@deepseek-ai/dsh-web-app/package.json')
      return (root = candidate)
    } catch {
      /* try the next candidate */
    }
  }
  die(
    [
      'could not find the dsh installation',
      `  tried: ${[...new Set(candidates)].join(', ') || '(nothing)'}`,
      '  set DSH_INSTALL to the directory holding node_modules/@deepseek-ai/dsh',
      '  (for the dsh-go app this is usually /opt/dsh)',
    ].join('\n'),
  )
}

function requireFromRoot(specifier) {
  return createRequire(join(dshInstallRoot(), 'package.json')).resolve(specifier)
}

function webAppPresetsDir() {
  try {
    return join(dirname(requireFromRoot('@deepseek-ai/dsh-web-app/package.json')), 'presets')
  } catch {
    die('@deepseek-ai/dsh-web-app is not part of this dsh installation, so this profile has no agent presets to override')
  }
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
const hasRegion = new RegExp(REGION.source, 'm').test(original)

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

// ---------------------------------------------------------------------------
// Preset overrides: same plugin list as the shipped preset, minus tool-web.
// ---------------------------------------------------------------------------

/** Shipped presets, in directory order, with their raw text. */
function shippedPresets() {
  const dir = webAppPresetsDir()
  if (!existsSync(dir)) die(`no presets directory at ${dir}`)
  return readdirSync(dir)
    .filter((file) => file.endsWith('.patch.yml'))
    .sort()
    .map((file) => ({ id: basename(file, '.patch.yml'), text: readFileSync(join(dir, file), 'utf8') }))
}

/** The shipped preset row, re-indented one level and without its tool-web entry. */
function presetBody(id, text) {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.trim() === `- id: preset-${id}`)
  if (start < 0) die(`preset-${id} not found in its shipped preset file`)
  const rowIndent = lines[start].match(/^ */)[0].length
  let end = start + 1
  while (end < lines.length) {
    const line = lines[end]
    if (line.trim().startsWith('- ') && line.match(/^ */)[0].length === rowIndent) break
    end += 1
  }
  const body = lines
    .slice(start, end)
    .map((line) =>
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
  }
  return body
}

const presets = shippedPresets()
const withToolWeb = presets.filter((preset) => /^\s*- id: tool-web\s*$/m.test(preset.text))
const wanted = opt.presets
  ? opt.presets
      .split(',')
      .map((name) => name.trim().replace(/^preset-/, ''))
      .filter(Boolean)
  : withToolWeb.map((preset) => preset.id)
if (wanted.length === 0) {
  console.log('note: this dsh version ships no preset with tool-web; only the MCP row will be added')
}
for (const id of wanted) {
  if (!presets.some((preset) => preset.id === id)) die(`no shipped preset named "${id}"`)
}

const authExpr = "(process.env.DSH_HOME || process.env.HOME + '/.dsh') + '/tinyfish.key'"
const region = [
  BEGIN,
  '# Managed block: `node install.mjs --force` regenerates it, `--revert` removes it.',
  '# 1. Mounts TinyFish over streamable HTTP. dsh has no interactive OAuth flow, so',
  '#    the connection authenticates with an API key read at activation time from',
  '#    $DSH_HOME/tinyfish.key (mode 600); the key never appears in this file.',
  '# 2. Overrides every shipped preset that carries tool-web with the same plugin',
  '#    list minus that entry. The preset a new session actually resolves is',
  '#    agent-preset-registry `selectedDefault` when set, else `default`; both are',
  '#    profile-level, and cordis / ptc ship tool-web just like standard, so',
  '#    overriding standard alone still leaves web_search reachable.',
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
]
for (const id of wanted) {
  const shipped = presets.find((preset) => preset.id === id)
  region.push(`- id: preset-${id}`, ...presetBody(id, shipped.text), '')
}
region.push(END)

function withoutManagedRegion(text) {
  return text.replace(REGION, '')
}

function asPatchBody(text) {
  const bare = text.trim()
  if (bare === '' || bare === '[]' || bare === '---\n[]' || bare === '--- []') return ''
  return text.replace(/\s*$/, '\n') + '\n'
}

const withoutRegion = withoutManagedRegion(original)
const next = asPatchBody(withoutRegion) + region.join('\n') + '\n'
if (!hasRegion) copyFileSync(patchPath, `${patchPath}.bak`)
writeFileSync(patchPath, next)

const yaml = createRequire(join(dshInstallRoot(), 'package.json'))('js-yaml')
const jsTag = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  construct: (data) => ({ __jsExpr: data }),
  instanceOf: Object,
})
try {
  yaml.load(next, { schema: yaml.DEFAULT_SCHEMA.extend([jsTag]) })
} catch (error) {
  if (!hasRegion) copyFileSync(`${patchPath}.bak`, patchPath)
  die(`generated patch does not parse${hasRegion ? '' : ', restored the backup'}:\n${error.message}`)
}

function presetSection(dump, id) {
  const marker = `- id: preset-${id}\n`
  const start = dump.indexOf(marker)
  if (start < 0) return ''
  const rest = dump.slice(start + 1)
  const end = rest.search(/\n- (?:id|insert):/)
  return end < 0 ? dump.slice(start) : dump.slice(start, start + 1 + end)
}

let dump = dumpConfig()
if (!dump.includes('serverName: tinyfish')) dump = dumpConfig()

const report = wanted.map((id) => {
  const section = presetSection(dump, id)
  const plugins = (section.match(/^ {6}- id: /gm) || []).length
  return { id, plugins, clean: section !== '' && !/\n\s*- id: tool-web\s*$/m.test(section) }
})

console.log('patched', patchPath)
console.log(
  'composed profile:',
  report.length === 0
    ? 'no preset override'
    : report
        .map(({ id, plugins, clean }) => `${id} (${plugins} plugins, ${clean ? 'tool-web removed' : 'tool-web STILL PRESENT'})`)
        .join(', '),
)
console.log('TinyFish MCP row mounted:', dump.includes('serverName: tinyfish'))
console.log('\nNext: restart the app, open a NEW session, then confirm it has mcp__tinyfish__search and no web_search.')
