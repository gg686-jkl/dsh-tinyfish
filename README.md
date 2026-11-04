# dsh-tinyfish

**Free web search for dsh — desktop and phone.**

- **Free.** dsh's built-in `web_search` / `web_fetch` go through DeepSeek's Search & Fetch API at
  **$0.75 per 1,000 searches** and **$0.75 per 1,000 fetches**. TinyFish search and fetch are free
  (rate-limited, no credit card) and the results are comparable.
- **Same setup on both.** One script for desktop `dsh` and the dsh-go Android app; nothing to hand-edit.
  It also works over a remote/LAN profile.
- **Clean exit.** Undo is one command, and your key never lands in the YAML.

After a restart, a new session sees `mcp__tinyfish__search` and `mcp__tinyfish__fetch_content`, and no
`web_search` / `web_fetch`.

<details>
<summary><b>Let an agent install it</b> — copy the prompt, fill in your key</summary>

```text
Switch this machine's dsh profile from the built-in web_search / web_fetch (DeepSeek's paid Search & Fetch API) to TinyFish MCP. Stop if a step fails.

TinyFish key: sk-tinyfish-xxxx

1. `command -v dsh` must print a path. Note $DSH_PROFILE and $DSH_PROFILE_DIR; that is the profile to patch.
2. git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
   (no git: curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz)
3. cd dsh-tinyfish-mcp && node install.mjs --key sk-tinyfish-xxxx
   If it reports that it cannot find the dsh installation, re-run with DSH_INSTALL=/opt/dsh in front.
4. Report the printed "composed profile:" and "TinyFish MCP row mounted:" lines verbatim; if either says STILL PRESENT or false, the install failed — say so.
5. Run: dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'serverName: tinyfish'   (expect 1)
6. Tell me to restart the app and open a new session; the current session keeps its old tools.

Constraints: only the current profile's cordis.patch.yml may change (the script backs it up); do not edit package.json, create AGENTS.md, or touch other profiles. Full version: PROMPT.md.
```

</details>

## Install

Free key: <https://agent.tinyfish.ai/api-keys>

```bash
git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
cd dsh-tinyfish-mcp
node install.mjs --key sk-tinyfish-xxxx
```

No git (usual on a phone):

```bash
curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz
cd dsh-tinyfish-mcp-main && node install.mjs --key sk-tinyfish-xxxx
```

Then restart the app and open a **new** session; the current one keeps the tools it started with.

## Check

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'serverName: tinyfish'   # expect 1
```

The install prints `composed profile: …` and `TinyFish MCP row mounted: true`. If either says
`STILL PRESENT` or `false`, it did not apply.

## Undo / after upgrading dsh

```bash
node install.mjs --revert    # restore the built-in web tools
node install.mjs --force     # regenerate for the new dsh version
```

## What it touches

- One marked block in the current profile's `cordis.patch.yml`; the first install leaves a `.bak`.
- Every shipped preset that carries `tool-web` (`standard`, `cordis`, `ptc`) is overridden, so switching
  presets cannot bring the paid tools back.
- The key lives in `$DSH_HOME/tinyfish.key` (mode 600) and never appears in YAML.

## If it fails

- `could not find the dsh installation` — prefix `DSH_INSTALL=/opt/dsh` (the dsh-go location).
- Installed into the wrong profile — `--profile <name>`; the default follows `$DSH_PROFILE`.
- Only want one preset changed — `--presets standard`.

Requires dsh ≥ 0.2. No dependencies are installed; the MCP client ships with dsh.

---

[中文](README.zh.md) · MIT
