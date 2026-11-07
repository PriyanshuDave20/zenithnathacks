# Shared agent skills
Committed skills live in `.claude/skills/` (Claude) and `.agents/skills/` (Codex). Keep both copies identical.
Review any third-party skill before adding it, and never put secrets in one.

| Skill | Source | License | Use for |
|---|---|---|---|
| apple-design | https://github.com/emilkowalski/skills/tree/main/skills/apple-design | MIT | Gestures, springs, sheets, translucent UI, motion, typography |
| prisma-* | https://github.com/prisma/skills | see upstream | Prisma 7 usage |
| impeccable (v4.8, engine 0.1.18) | https://github.com/pbakaus/impeccable | Apache-2.0 | Design critique/polish/audit (`/impeccable ...`) + automatic design-check hook |
| ui-ux-pro-max (v2.15.0) | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill @ 3a13158 | MIT | Searchable local UI/UX database: styles, palettes, fonts, UX rules, 22 stacks. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system` |

## impeccable notes
- Installed with `npx impeccable install --providers=claude,codex --scope=project`, including subagents and the design hook.
- **Hook:** after each UI edit and at Stop, runs a local detector and feeds findings back to the agent. Claude hooks are in `.claude/settings.json`; Codex hooks in `.codex/hooks.json`.
- **Trust:** each teammate must approve the hooks once: run `/hooks` in Claude and in Codex. Changed definitions need re-approval.
- **Engine binary** (Rust) is NOT in git. The launcher downloads it once to the skill's `scripts/bin/` or `~/.impeccable/bin/`, verifying a pinned SHA-256 (`engine-checksums.txt`); `scripts/setup.sh` warms it.
- **Disable:** `/impeccable hooks off`, or env `IMPECCABLE_HOOK_DISABLED=1` for one run.
- **Telemetry** off project-wide (`.impeccable/config.json`). It still fetches a visual-directions catalog and checks for updates (`IMPECCABLE_NO_UPDATE_CHECK=1` to stop). Hook checks don't upload project files.
- Claude and Codex copies differ on purpose; update with `npx impeccable update` and commit both.

## MCP servers
| Server | Source | License | Config |
|---|---|---|---|
| playwright | https://github.com/microsoft/playwright-mcp (pinned 0.0.84) | Apache-2.0 | `.mcp.json` (Claude), `.codex/config.toml` (Codex) |

- Lets agents drive a real browser to check the app. Uses system Chrome; run with `--isolated` (in-memory profile, no saved logins).
- **Not a security boundary** (per upstream): only point it at localhost / our own app, never at pages with real accounts or untrusted content.
- Claude asks each person to approve the project MCP server on first use; Codex needs the project marked trusted.
- MCP tool schemas cost context. Upstream notes its CLI+skills (https://github.com/microsoft/playwright-cli) is more token-efficient for coding agents; consider it if context gets tight.
- For mobile checks, add `"--device", "iPhone 15"` to the args.
- Bump the pinned version deliberately, after reading the release notes.

## ui-ux-pro-max notes
- Only the core skill is installed (not the repo's other bundled skills: brand, slides, banner-design, ui-styling, design). Test fixtures removed.
- Pure-Python, stdlib-only local search over CSVs; no network or subprocess calls (reviewed). `--persist` writes `design-system/<slug>/MASTER.md` under `--output-dir`; never use `--force` without asking.
- Upstream commands used `${CLAUDE_PLUGIN_ROOT}` (plugin installs); rewritten to project-relative paths for each agent.
- Not executed during review; Python 3.9 compatibility unverified. Run one search after your first pull to confirm.
