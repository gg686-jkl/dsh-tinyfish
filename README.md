# dsh-tinyfish

**dsh keeps its own web_search and web_fetch; TinyFish answers them, free.**

English | [中文](README.zh.md)

![Same tools, free backend](assets/hero.png)

## Let an agent install it

Copy this, replace the key, hand it to any coding agent (dsh, Claude Code, Codex…). It brings its own
steps and verifies the result.

```text
Install TinyFish as the free backend of this machine's dsh web tools. Keep the official web_search /
web_fetch tools exactly as they are: do not remove, disable or replace tool-web.

Key: sk-tinyfish-xxxx

git clone https://github.com/gg686-jkl/dsh-tinyfish.git && cd dsh-tinyfish
node install.mjs --key sk-tinyfish-xxxx        # add --profile <name> only if one was named

Then: report the three printed lines (provider row mounted / web seam pointed at tinyfish / official
web_search/web_fetch enabled), run `dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c
web-tinyfish` (expect 1), and tell me to restart the app and open a new session. Only the current
profile's cordis.patch.yml may change (the script backs it up first); do not write AGENTS.md. If a step
fails, say so instead of claiming success. Full version: https://github.com/gg686-jkl/dsh-tinyfish/blob/main/PROMPT.md
```

## Or do it yourself

Get a free key at <https://agent.tinyfish.ai/api-keys>, then:

```bash
git clone https://github.com/gg686-jkl/dsh-tinyfish.git
cd dsh-tinyfish
node install.mjs --key sk-tinyfish-xxxx
```

No git (usual on a phone):

```bash
curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish/tar.gz/refs/heads/main | tar xz
cd dsh-tinyfish-main && node install.mjs --key sk-tinyfish-xxxx
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
and neither touches the TinyFish wallet. DeepSeek's Search & Fetch APIs bill $0.75 per 1,000 requests
each.

**What about browser automation or deep research?** TinyFish charges for those, so they are not mounted
by default. `node install.mjs --key … --with-mcp` adds them as `mcp__tinyfish__*` tools.

**Why not just use the TinyFish MCP server for everything?** Its tools get namespaced
(`mcp__tinyfish__search`) and use different schemas, so a model that knows `web_search` has to relearn
them. Keeping the official tools costs nothing and behaves identically.

**Does it work on the dsh-go Android app?** Yes — same commands, no dependencies.

**Already installed the old MCP-only version?** `node install.mjs --key … --force` upgrades in place.

## Notes

- Requires dsh ≥ 0.2. Nothing is installed but the repo itself.
- The key lives in `$DSH_HOME/tinyfish.key` (mode 600) and never enters YAML.
- Need TinyFish's advanced fetch parameters (`format`, CSS selectors, 10 URLs at once) or automation and
  research in the same session? Use `--with-mcp`; TinyFish bills those per use.

MIT
