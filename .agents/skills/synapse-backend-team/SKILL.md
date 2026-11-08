---
name: synapse-backend-team
description: Coordinate Synapse Backend 1 implementation and independent review with scoped agents and isolated worktrees. Use for an explicit backend-team request or substantial backend work with independent scopes; keep simple questions and trivial edits in the main thread.
---

# Synapse backend team

The current conversation is the coordinator. Keep the user's existing authorization,
project lanes, privacy rules and provider choice. Read `AGENTS.md`, `docs/TEAM.md`,
`docs/TASKS.md`, the newest `docs/HANDOFF.md` entries and the relevant lane instructions.
This is a development workflow; it never adds agents to the application's runtime.

## Scope the work

Capture the bug/feature, acceptance criteria, base SHA and exact writable files.
Use the existing task board and handoff, not a second task system. The coordinator
alone updates shared task/handoff docs and integrates/pushes the final changes.
Backend 1 owns `src/app/api/**`, `src/lib/server/**`, `src/lib/questions/**`.
Contracts, provider foundation and shared files need an explicit scoped assignment;
the team workflow itself does not authorize changing other lanes.

Keep small or tightly dependent fixes in the main thread. For substantial work,
use one `synapse-backend` implementer and then an independent `synapse-reviewer`.
A second implementer is useful only for genuinely independent, file-disjoint work;
serialize review until both writers finish. At most two subagents may be open at
once. Do not spawn a coordinator or recursive worker pools. Inherit the current
model/reasoning/provider; change them only when the user asks.

## Isolate editing

One agent per checkout, including the coordinator. Prepare a distinct worktree and
branch for every editing worker, from the explicit base SHA. For example:

```sh
git worktree add -b prem/<task>-impl /private/tmp/synapse-<task>-impl <base-sha>
```

Use a unique unused path/branch; inspect existing worktrees instead of replacing
one. Do not copy `.env`, credentials, user/session data or agent transcripts.
Use installed dependencies or an explicit dependency-setup task; do not silently
install provider SDKs or change manifests. The coordinator handles Git sync and
preserves published commits; workers never pull/rebase the parent's branch.

Give each worker: task, absolute worktree path, branch, base SHA, writable files,
forbidden shared files, acceptance criteria, required checks and expected output.
Use the native custom role when available. Otherwise instruct the worker to read
the matching `.codex/agents/synapse-backend.toml` or `synapse-reviewer.toml` and
apply its `developer_instructions`; do not pretend native role discovery occurred.

Workers return their commit/file list, check outcomes, gaps and handoff notes.
Inspect the diff before integrating their commits. Stop overlapping writers and
serialize a shared-file dependency instead of letting them race.

## Review a fixed candidate

After implementation checks, pin the integration candidate SHA. Prepare a separate
review worktree at that exact commit, for example:

```sh
git worktree add --detach /private/tmp/synapse-<task>-review <candidate-sha>
```

Give `synapse-reviewer` the original acceptance criteria, base/candidate SHAs,
review worktree and verification evidence. Do not feed it the implementer's verdict
or suspected findings. No tracked-file edits, live calls or further delegation.
Role instructions do not create a separate OS sandbox; they inherit the parent's
permissions. Use a read-only parent session if filesystem enforcement is required.

The coordinator resolves material findings and requests focused rechecks of changed
areas. Preserve evidence and actual remaining gaps; do not repeat successful checks
without changed code, new failures or a concrete unresolved concern.

## Verify and hand off

Use offline synthetic fixtures by default. At runtime only free text/transcripts and clinician
replies may reach the configured model; guided selections stay local/deterministic.
The coordinator performs live checks only within the user's existing authorization,
using synthetic data and without exposing keys or bodies. No patient data or model
responses in task artifacts, caches, logs or messages between agents.

Run `npm run typecheck`, `npm run lint` and applicable tests on the integrated
candidate. Match HTTP contracts exactly and use the installed Next.js docs for code
changes. Browser-check user-visible changes at phone size when relevant. Static,
mocked and live checks must be distinguished; none establishes clinical/language
accuracy. Record code decisions, checks and gaps in task/handoff docs, then commit
and push only the scoped task branch. Do not merge main or deploy unless requested.

If delegation is unavailable, execute the same scoped workflow sequentially and
report that no independent review ran. Never label a self-review independent.
