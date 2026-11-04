# Agent prompt: deploy TinyFish as the web toolkit

Paste the block below into a fresh agent session and replace `sk-tinyfish-xxxx` with your key
(free, from <https://agent.tinyfish.ai/api-keys>). Everything the agent needs is in the block.

---

Switch this machine's dsh profile from the built-in `web_search` / `web_fetch` (DeepSeek's paid Search &
Fetch API) to the TinyFish MCP server. Work in order and stop if a step fails.

TinyFish key: `sk-tinyfish-xxxx`

1. `command -v dsh` must print a path. Note `$DSH_PROFILE` and `$DSH_PROFILE_DIR`; that is the profile to
   patch, do not pick another.

2. Fetch the repo:

   ```bash
   git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
   ```

   No git: `curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz`

3. Install:

   ```bash
   cd dsh-tinyfish-mcp          # dsh-tinyfish-mcp-main for the tarball
   node install.mjs --key sk-tinyfish-xxxx
   ```

   Add `--profile <name>` only if the user named a different profile. If it reports that it cannot find
   the dsh installation, re-run with `DSH_INSTALL=/opt/dsh` in front (dsh-go's location).

4. Report these two printed lines verbatim: `composed profile: …` and `TinyFish MCP row mounted: …`.
   If either says `STILL PRESENT` or `false`, report the failure — do not claim success.

5. Verify, and include the number in the report:

   ```bash
   dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'serverName: tinyfish'
   ```

   Expect `1`.

6. Tell the user, in their language: restart the app, then open a **new** session. The current session
   keeps its old tools. The new session should list `mcp__tinyfish__search` and no `web_search`.

Constraints, which the script already respects, so do not work around it:

- Only the current profile's `cordis.patch.yml` changes; it is backed up to `.bak` first.
- Do not edit `package.json`, create `AGENTS.md`, or touch other profiles, the TUI, or repo files.
- Never print the key except as the `--key` argument; it belongs in `$DSH_HOME/tinyfish.key` (0600).
- On failure, `node install.mjs --revert` and report the error you saw.
