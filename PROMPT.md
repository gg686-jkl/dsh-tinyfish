# Agent prompt: deploy TinyFish as the web toolkit

Copy the block below into a fresh agent session and replace `sk-tinyfish-xxxx` with a real key
(get one at <https://agent.tinyfish.ai/api-keys>). Everything the agent needs is in the prompt, so it
does not have to read this repository first.

---

You are switching this machine's dsh profile from the built-in `web_search` / `web_fetch` tools to
the TinyFish MCP server (`mcp__tinyfish__search`, `mcp__tinyfish__fetch_content`, and the rest of
`mcp__tinyfish__*`). Work through the steps in order and stop if one fails.

TinyFish key: `sk-tinyfish-xxxx`

1. Confirm the tooling:
   - `command -v dsh` must print a path. If it does not, stop and tell the user dsh is not installed.
   - Note `$DSH_PROFILE` and `$DSH_PROFILE_DIR`. Those name the profile to patch; do not guess another.

2. Fetch the repository:
   ```bash
   git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
   ```
   If git is missing:
   ```bash
   curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz
   ```

3. Install:
   ```bash
   cd dsh-tinyfish-mcp        # or dsh-tinyfish-mcp-main for the tarball
   node install.mjs --key sk-tinyfish-xxxx
   ```
   - The script defaults to `$DSH_PROFILE_DIR` / `$DSH_PROFILE`; add `--profile <name>` only when the
     user named a different profile.
   - If it reports that it cannot find the dsh installation, re-run the same command with
     `DSH_INSTALL=/opt/dsh` in front (the dsh-go phone app installs there).
   - Do not hand-edit the profile or install dependencies; the script generates everything.

4. Report back, verbatim, the two lines the script prints:
   - `composed profile: ...`
   - `TinyFish MCP row mounted: ...`
   If either says `tool-web STILL PRESENT` or `false`, say the install did not take effect instead of
   claiming success.

5. Verify the composed profile:
   ```bash
   dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'serverName: tinyfish'
   ```
   Expect `1`. Paste the number with the rest of the report.

6. Tell the user, in their language: restart the app, then open a **new** session. The current session
   keeps its old tool list, because dsh fixes the agent preset when a session starts. In the new
   session the agent should see `mcp__tinyfish__search` and no `web_search`.

Constraints, all of which the install script already respects:

- Only the current profile's `cordis.patch.yml` may change; the script backs it up to
  `cordis.patch.yml.bak` before the first write.
- Do not edit `package.json`, do not create or edit `AGENTS.md`, do not touch other profiles, the TUI,
  or the repository's own files.
- Do not echo the key anywhere except as the `--key` argument; it ends up in
  `$DSH_HOME/tinyfish.key` (mode 600) and must not appear in the YAML.
- If something goes wrong after the write, roll back with `node install.mjs --revert` and report the
  error you saw.
