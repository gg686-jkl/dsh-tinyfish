# Agent prompt: deploy TinyFish as the web toolkit

Paste the block below into a fresh agent session and replace `sk-tinyfish-xxxx` with your key
(free, from <https://agent.tinyfish.ai/api-keys>). Everything the agent needs is in the block.

---

Switch this machine's dsh profile from DeepSeek's paid Search & Fetch API to TinyFish. Keep the
model-facing tools exactly as they are: the installed `@deepseek-ai/dsh-tool-web` plugin must still
provide `web_search` / `web_fetch` with their official names and parameters — the script only registers
TinyFish as the backend (`ctx.web` provider). Work in order and stop if a step fails.

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

4. Report these printed lines verbatim:

   ```
   provider row mounted: …
   web seam pointed at tinyfish: …
   official web_search/web_fetch enabled: …
   ```

   If any is `false`, report the failure — do not claim success.

5. Verify, and include the number in the report:

   ```bash
   dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'
   ```

   Expect `1`.

6. Tell the user, in their language: restart the app, then open a **new** session. The current session
   keeps the tools it started with. In the new session `web_search` / `web_fetch` should be listed exactly
   as before, and results should now come from TinyFish.

Constraints, which the script already respects, so do not work around it:

- Only the current profile's `cordis.patch.yml` changes; it is backed up to `.bak` first.
- Do not edit `package.json`, create `AGENTS.md`, or touch other profiles, the TUI, or repo files.
- Do not remove or disable `tool-web` and do not hand-write tool schemas: the official tools stay.
- Never print the key except as the `--key` argument; it belongs in `$DSH_HOME/tinyfish.key` (0600).
- On failure, `node install.mjs --revert` and report the error you saw.
