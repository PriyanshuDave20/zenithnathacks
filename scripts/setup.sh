#!/usr/bin/env bash
# Run on each new laptop: ./scripts/setup.sh
set -euo pipefail
have() { command -v "$1" >/dev/null 2>&1; }

echo "== Checking tools =="
for t in git node npm gh; do have "$t" && echo "ok  $t" || echo "MISSING $t"; done
have claude || echo "MISSING claude  -> npm i -g @anthropic-ai/claude-code"
have codex  || echo "MISSING codex   -> npm i -g @openai/codex"
have gh     || echo "Install GitHub CLI: brew install gh"

[ -f .env ] || { cp .env.example .env; echo "Created .env from .env.example"; }

git config user.name  >/dev/null || echo "Set: git config --global user.name 'Your Name'"
git config user.email >/dev/null || echo "Set: git config --global user.email you@example.com"

echo "== Next: add stack-specific install steps below =="
npm install
# Warm the impeccable engine (downloads once, SHA-256 verified) so the edit hook isn't slow/timing out
.claude/skills/impeccable/scripts/impeccable engine-probe >/dev/null 2>&1 || echo 'impeccable engine not ready; run .claude/skills/impeccable/scripts/impeccable engine-probe'
echo 'REMINDER: in Claude run /hooks and in Codex run /hooks to review+trust the design hooks.'
echo 'Now put the real DATABASE_URL in .env (ask the team), then: npm run dev'
