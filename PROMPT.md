# Agent prompt: put TinyFish behind dsh's web tools

Best used in a dsh session running **Creator mode** (创造模式), the preset meant for changing the
harness; any agent that can run shell commands works too. Paste the block below and replace
`sk-tinyfish-xxxx` with your key (free, from <https://agent.tinyfish.ai/api-keys>).

---

This machine's dsh pays for web search and fetch through DeepSeek's Search & Fetch API. Switch that to
TinyFish, which is free, without changing the tools the model sees: keep `web_search` / `web_fetch` as
they are, and let `install.mjs` register TinyFish as the `ctx.web` provider behind them. Work in order and
stop if a step fails.

TinyFish key: `sk-tinyfish-xxxx`

1. `command -v dsh` must print a path. Note `$DSH_PROFILE` and `$DSH_PROFILE_DIR`; that is the profile to
   patch, don't pick another.

2. Fetch the repo:

   ```bash
   git clone https://github.com/gg686-jkl/dsh-tinyfish.git
   ```

   No git: `curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish/tar.gz/refs/heads/main | tar xz`

3. Install:

   ```bash
   cd dsh-tinyfish          # dsh-tinyfish-main for the tarball
   node install.mjs --key sk-tinyfish-xxxx
   ```

   Add `--profile <name>` only if the user named a different profile. If it says it cannot find the dsh
   installation, re-run with `DSH_INSTALL=/opt/dsh` in front (dsh-go's location).

4. Report these printed lines verbatim:

   ```
   provider row mounted: …
   web seam pointed at tinyfish: …
   official web_search/web_fetch enabled: …
   ```

   If any is `false`, the install failed: say so instead of claiming success.

5. Check, and include the number in the report:

   ```bash
   dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'
   ```

   Expect `1`.

6. Tell the user, in their language: restart the app, then open a **new** session. The current session
   keeps the tools it started with; the new one lists `web_search` / `web_fetch` as before, now answered
   by TinyFish.

Constraints. The script already follows them, so don't work around it:

- Only the current profile's `cordis.patch.yml` changes; it is backed up to `.bak` first.
- Don't edit `package.json`, create `AGENTS.md`, or touch other profiles, the TUI, or repo files.
- Don't remove or disable `tool-web`, and don't hand-write tool schemas.
- Never print the key except as the `--key` argument; it belongs in `$DSH_HOME/tinyfish.key` (0600).
- On failure: `node install.mjs --revert`, then report the error you saw.
