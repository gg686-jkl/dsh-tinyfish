# dsh-tinyfish

Replace DeepSeek Harness's built-in `web_search` / `web_fetch` with [TinyFish](https://agent.tinyfish.ai) MCP tools
(`mcp__tinyfish__search`, `mcp__tinyfish__fetch_content`, `mcp__tinyfish__run_web_automation`, …).

One command, on any machine running dsh: desktop `dsh`, dsh-go on a phone, a remote profile over the LAN.

English | [中文](README.zh.md)

## What it changes

It edits only the current profile's `cordis.patch.yml`, appending one marked block:

1. Mounts the TinyFish MCP server (`https://agent.tinyfish.ai/mcp`, streamable HTTP, API-key auth).
2. For every shipped agent preset that carries `tool-web` (currently `standard`, `cordis` and `ptc`), writes an override with the same plugin list minus that entry. New sessions then get only `mcp__tinyfish__*`, with no built-in `web_search` / `web_fetch`.

Why not `standard` alone: `agent-preset-registry` resolves `selectedDefault` before `default` for a new session, and either can name a preset other than `standard`; `cordis` and `ptc` ship `tool-web` too. Overriding `standard` alone leaves `web_search` reachable as soon as a session lands on `cordis`.

The overrides are generated from the dsh installation on the machine that runs the script, so dsh version differences do not matter. Nothing touches `package.json`, no dependencies are installed (the MCP client ships with dsh), and pnpm is not needed.

## Install

Get a key: <https://agent.tinyfish.ai/api-keys>

```bash
git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
cd dsh-tinyfish-mcp
node install.mjs --key sk-tinyfish-xxxx
```

No git on the machine (the Ubuntu image used by phones usually lacks it):

```bash
curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz
cd dsh-tinyfish-mcp-main
node install.mjs --key sk-tinyfish-xxxx
```

The script reads `$DSH_PROFILE_DIR` / `$DSH_PROFILE` by default (both are set inside a dsh session). To target another profile, pass `--profile <name>`.

By default every shipped preset with `tool-web` is overridden. To narrow it:

```bash
node install.mjs --key sk-tinyfish-xxxx --presets standard
```

When `dsh` on PATH is a launcher shim (the dsh-go phone app ships one), the script reads the real `lib/bin.js` path out of the launcher to locate the installation. If it still cannot find one, it tells you to set `DSH_INSTALL` to the directory holding `node_modules/@deepseek-ai/dsh` (usually `/opt/dsh` for dsh-go).

## Verify

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'serverName: tinyfish'
```

The installer prints a summary like:

```
composed profile: cordis (22 plugins, tool-web removed), ptc (22 plugins, tool-web removed), standard (21 plugins, tool-web removed)
TinyFish MCP row mounted: true
```

Each preset's plugin count is the shipped count minus one, the removed `tool-web`. `tool-web STILL PRESENT` means the override did not take effect.

Then restart the app and open a new session; ask it for its tools. It should list `mcp__tinyfish__search` and no `web_search`.

## Rollback / after a dsh upgrade

```bash
node install.mjs --revert    # remove the whole block, restoring the built-in web tools
node install.mjs --force     # regenerate from the new dsh version's presets
```

`--revert` removes everything between `# >>> dsh-tinyfish` and `# <<< dsh-tinyfish`, so every preset override is restored too. The first install leaves a `cordis.patch.yml.bak` next to the patch.

## Notes

- The key is written to `$DSH_HOME/tinyfish.key` (mode 600) and read with `!!js` at activation time; the YAML never contains it.
- Existing sessions keep the tools they started with, because dsh fixes the agent preset at session start. Sessions restored after an app restart rebind to the current definition.
- If you installed the bundle instead (this repository root is also a bundle: `package.json` + `cordis.patch.yml` + `locale/` + `icon.svg`), the script notices the mounted TinyFish row and skips. That path suits desktop `plugin_manager install_bundle`, but it covers `standard` only and its preset snapshot is frozen at authoring time, so it needs re-syncing after a dsh upgrade. Use `install.mjs` to cover every preset.
- No `AGENTS.md` is written: the MCP tool descriptions already carry TinyFish's usage rules (search before `fetch_content`, `run_web_automation` may still be running after it times out, and so on).

## Deploy with an agent

Hand [PROMPT.md](PROMPT.md) to a coding agent together with your key. The prompt makes the agent run the install and verification above and report the result back; it also carries the constraints (only the profile patch changes, no `package.json` edits, no `AGENTS.md`, other profiles untouched).

```text
Set up TinyFish MCP as the web toolkit for this dsh profile, replacing the built-in web_search / web_fetch. Full instructions: PROMPT.md in https://github.com/gg686-jkl/dsh-tinyfish-mcp. Key: sk-tinyfish-xxxx
```

## Requirements

dsh ≥ 0.2 (`@deepseek-ai/dsh-mcp-client`, and `@deepseek-ai/dsh-web-app`'s `presets/*.patch.yml`).

## Links

- TinyFish for coding agents: <https://docs.tinyfish.ai/for-coding-agents>
- Full API: <https://docs.tinyfish.ai/llms-full.txt>

MIT
