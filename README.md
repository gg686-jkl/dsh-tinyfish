# dsh-tinyfish

**Free web search and fetch for dsh — without changing the tools your model already knows.**

English | [中文](README.zh.md)

![Same tools, free backend](assets/hero.png)

dsh ships `web_search` and `web_fetch`, backed by DeepSeek's paid Search & Fetch APIs
(**$0.75 per 1,000 requests each**). This keeps those exact tools — same names, same parameters, same
descriptions — and sends the requests to TinyFish instead, which is free.

## Install

Get a free key at <https://agent.tinyfish.ai/api-keys>, then:

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

Restart dsh, open a **new session**. Done — search and fetch now go through TinyFish.

## Check

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c web-tinyfish   # expect 1
```

## Undo

```bash
node install.mjs --revert
```

## FAQ

**Do the tools change?** No. `web_search` / `web_fetch` keep the official names, parameter schemas,
descriptions and output format. This project only registers TinyFish as the `ctx.web` provider, so the
model sees the tools it was trained on.

**What does it cost?** Nothing. TinySearch is free at 30 requests/min, TinyFetch free at 1,000 URLs/day,
and neither touches the TinyFish wallet.

**What about browser automation or deep research?** TinyFish charges for those, so they are not mounted
by default. `node install.mjs --key … --with-mcp` adds them as `mcp__tinyfish__*` tools.

**Why not just use the TinyFish MCP server for everything?** Its tools get namespaced
(`mcp__tinyfish__search`) and use different schemas, so a model that knows `web_search` has to relearn
them. Keeping the official tools costs nothing and behaves identically.

**Does it work on the dsh-go Android app?** Yes — same commands, no dependencies.

**Already installed the old MCP-only version?** `node install.mjs --key … --force` upgrades in place.

<details>
<summary><b>Let an agent do it</b> — copy this, fill in your key</summary>

```text
Switch this machine's dsh profile from DeepSeek's paid Search & Fetch API to TinyFish, without changing what the model sees: the installed @deepseek-ai/dsh-tool-web must keep providing web_search / web_fetch with their official names and parameters - the script only registers TinyFish as the ctx.web provider. Work in order and stop if a step fails.

TinyFish key: sk-tinyfish-xxxx

1. `command -v dsh` must print a path. Note $DSH_PROFILE and $DSH_PROFILE_DIR; that is the profile to patch, do not pick another.
2. git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
   (no git: curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz)
3. cd dsh-tinyfish-mcp && node install.mjs --key sk-tinyfish-xxxx
   If it reports that it cannot find the dsh installation, re-run with DSH_INSTALL=/opt/dsh in front.
4. Report these printed lines verbatim: provider row mounted / web seam pointed at tinyfish / official web_search/web_fetch enabled. Any false means the install failed - say so.
5. Run: dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'   (expect 1)
6. Tell me to restart the app and open a new session. The new session should list web_search / web_fetch exactly as before, and results should come from TinyFish.

Constraints: only the current profile's cordis.patch.yml may change (the script backs it up); do not edit package.json, create AGENTS.md, or touch other profiles; do not remove or disable tool-web. Full version: PROMPT.md.
```

</details>

## Notes

- Requires dsh ≥ 0.2. Nothing is installed but the repo itself.
- The key lives in `$DSH_HOME/tinyfish.key` (mode 600) and never enters YAML.
- Needs TinyFish's advanced fetch parameters (`format`, CSS selectors, 10 URLs at once) or wants
  automation/research in the same session? Use `--with-mcp`; those capabilities are billed by TinyFish.

MIT
