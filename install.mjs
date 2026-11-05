#!/usr/bin/env node
/**
 * Put TinyFish behind dsh's own `web_search` / `web_fetch` tools.
 *
 * The shipped `@deepseek-ai/dsh-tool-web` plugin already owns those tool names,
 * parameter schemas, descriptions and rendering; this installer only registers
 * TinyFish as the `ctx.web` search + fetch provider, so a model trained on the
 * official tools sees exactly the shapes it knows. No MCP server is mounted:
 * the free TinyFish products are search and fetch, which these tools cover.
 *
 *   node install.mjs --key sk-tinyfish-... [--profile web]
 *   node install.mjs --profile web --force      # after moving the repo or upgrading dsh
 *   node install.mjs --profile web --revert     # remove the managed block
 *   node install.mjs --key ... --with-mcp       # also mount the paid MCP extras
 */
import { chmodSync, copyFileSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const BEGIN = '# >>> dsh-tinyfish'
const END = '# <<< dsh-tinyfish'
const HERE = dirname(fileURLToPath(import.meta.url))
const PROVIDER = pathToFileURL(join(HERE, 'provider', 'index.mjs')).href
const opt = { force: false, revert: false, withMcp: false, profile: null, key: null }

for (let i = 0; i < process.argv.length - 2; i += 1) {
  const arg = process.argv[i + 2]
  if (arg === '--force' || arg === '-f') opt.force = true
  else if (arg === '--revert') opt.revert = true
  else if (arg === '--with-mcp') opt.withMcp = true
  else if (arg === '--profile' || arg === '-p') opt.profile = process.argv[(i += 1) + 2]
  else if (arg === '--key' || arg === '-k') opt.key = process.argv[(i += 1) + 2]
  else if (arg === '--help' || arg === '-h') {
    console.log(usage())
    process.exit(0)
  } else die(`unknown argument: ${arg}\n\n${usage()}`)
}

function usage() {
  return [
    'usage: node install.mjs [--profile <name>] [--key <tinyfish-key>] [--with-mcp] [--force] [--revert]',
    '',
    '  --profile  dsh profile to patch (default: $DSH_PROFILE_DIR, else $DSH_PROFILE, else "web")',
    '  --key      TinyFish API key; written to $DSH_HOME/tinyfish.key (mode 600)',
    '  --with-mcp also mount the TinyFish MCP server (paid extras: agent, browser, monitors)',
    '  --force    regenerate the managed block, e.g. after moving this directory',
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
    // A launcher shim (the dsh-go app ships one) names the real bin.js inside.
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

function loadYaml() {
  return createRequire(join(dshInstallRoot(), 'package.json'))('js-yaml')
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

function withoutManagedRegion(text) {
  if (!text.includes(BEGIN)) return text
  return text.slice(0, text.indexOf(BEGIN)) + text.slice(text.indexOf(END) + END.length + 1)
}

function asPatchBody(text) {
  const bare = text.trim()
  if (bare === '' || bare === '[]' || bare === '---\n[]' || bare === '--- []') return ''
  return text.replace(/\s*$/, '\n') + '\n'
}

if (opt.revert) {
  if (!hasRegion) die('this profile has no managed dsh-tinyfish block')
  const stripped = withoutManagedRegion(original).replace(/\s*$/, '')
  writeFileSync(patchPath, (stripped.trim() === '' ? '[]' : stripped) + '\n')
  console.log('removed the dsh-tinyfish block from', patchPath)
  console.log('restart the app, then use a new session to get the shipped web tools back')
  process.exit(0)
}

const regionText = hasRegion ? original.slice(original.indexOf(BEGIN)) : ''
const outdated = hasRegion && !regionText.includes('web-tinyfish')
if (hasRegion && !opt.force && !outdated) {
  console.log('already installed (managed block present); use --force to regenerate it')
  process.exit(0)
}
if (outdated) console.log('upgrading the existing block to the provider-based version (backup kept)')

const before = hasRegion ? '' : dumpConfig()
if (!hasRegion && before.includes('web-tinyfish')) {
  console.log('already installed (TinyFish provider is mounted by another layer, e.g. a profile bundle)')
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

const region = [
  BEGIN,
  '# Managed block: `node install.mjs --force` regenerates it, `--revert` removes it.',
  '# 1. web-tinyfish registers TinyFish on the ctx.web seam. The shipped tool-web',
  '#    plugin keeps owning web_search / web_fetch, so the model-facing names and',
  '#    parameter schemas stay exactly the official ones.',
  '# 2. The web row selects the TinyFish provider for both search and fetch.',
  '#    Nothing else is mounted: no MCP tools, no namespaced names. The key is read',
  '#    from $DSH_HOME/tinyfish.key (mode 600) and never appears in this file.',
  '- insert:',
  '    - id: web-tinyfish',
  `      name: ${PROVIDER}`,
  ...(opt.withMcp
    ? [
        '    - id: mcp-tinyfish',
        "      name: '@deepseek-ai/dsh-mcp-client'",
        '      config:',
        '        serverName: tinyfish',
        '        transport: streamable-http',
        '        url: https://agent.tinyfish.ai/mcp',
        '        toolCallTimeoutMs: 180000',
        '        failOnStartupError: true',
        '        headers:',
        `          Authorization: !!js "'Bearer ' + process.getBuiltinModule('node:fs').readFileSync((process.env.DSH_HOME || process.env.HOME + '/.dsh') + '/tinyfish.key', 'utf8').trim()"`,
      ]
    : []),
  '- id: web',
  '  config:',
  '    searchProvider: tinyfish',
  '    fetchProvider: tinyfish',
  END,
]

const next = asPatchBody(withoutManagedRegion(original)) + region.join('\n') + '\n'

// Validate before touching the profile, so a broken generation never reaches disk.
const yaml = loadYaml()
const jsTag = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  construct: (data) => ({ __jsExpr: data }),
  instanceOf: Object,
})
try {
  yaml.load(next, { schema: yaml.DEFAULT_SCHEMA.extend([jsTag]) })
} catch (error) {
  die(`generated patch does not parse, nothing was written:\n${error.message}`)
}

copyFileSync(patchPath, `${patchPath}.bak`)
writeFileSync(patchPath, next)

let dump
try {
  dump = dumpConfig()
  if (!dump.includes('web-tinyfish')) dump = dumpConfig()
} catch {
  console.log('patched', patchPath)
  console.log('could not run --dump-config to verify; run the checks in README.md by hand')
  process.exit(0)
}
const officialTools = dump.includes("name: '@deepseek-ai/dsh-tool-web'") && !/name: '@deepseek-ai\/dsh-tool-web'\n\s+disabled: true/.test(dump)
console.log('patched', patchPath)
console.log('provider row mounted:', dump.includes('id: web-tinyfish'))
console.log('web seam pointed at tinyfish:', /searchProvider: tinyfish/.test(dump) && /fetchProvider: tinyfish/.test(dump))
console.log('official web_search/web_fetch enabled:', officialTools)
if (opt.withMcp) console.log('TinyFish MCP row (paid extras):', dump.includes('id: mcp-tinyfish'))
console.log('\nNext: restart the app, open a NEW session, then run a web search: it should report using TinyFish.')
