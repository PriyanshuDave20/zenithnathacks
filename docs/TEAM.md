# Team Protocol: working with multiple people and agents

Read this before you start. Agents read it too (see `AGENTS.md`). Change it by PR and tell the team.
New to git or AI agents? Read `docs/GETTING_STARTED.md` first; it explains the same rules in plain language.

## Lanes
| Lane | Tool | Owns | Does not touch |
|------|------|------|----------------|
| Frontend | Claude | `src/app/**` pages, `src/components/**` except `input/`, styles, `public/` | `src/app/api/**`, `src/lib/server/**`, `src/components/input/**`, `src/lib/input/**` |
| Backend 1 (API) | Codex | `src/app/api/**`, `src/lib/server/**`, `src/lib/questions/` | pages, components |
| Backend 2 (input channels) | Codex | `src/components/input/**`, `src/lib/input/**` | API routes, `src/lib/server/**`, patient/clinician screens |
| Contracts | Both, by PR only | `docs/API.md`, `src/lib/contracts/**` | n/a |

A lane is a set of folders, not a job title. "Backend 2" works in the browser, so it owns the input folders only.
The tool does not matter; the lane does. Stay in your folders even if you use a different agent.

## Backend 1: API (one person, lanes A and B)
| | A: translate | B: respond, redaction, metrics, question bank |
|---|---|---|
| Routes | `src/app/api/translate/` | `src/app/api/respond/`, `src/app/api/metrics/` |
| Logic | `src/lib/server/translate/**` | `src/lib/server/respond/**`, `redact.ts`, `metrics.ts` |
| Prompts | `translate/prompts.ts` | `respond/prompts.ts` |
| Data | n/a | `src/lib/questions/` (questions, options, pictogram ids, pre-translations, region to questions map) |

## Backend 2: input channels (ICU and sign)
All browser-side; camera video never leaves the device. Build in this order:
1. Body diagram component with tap selection (`src/components/input/body-diagram/`).
2. Gaze selection: webcam tracking, calibration, large targets, dwell-to-select (`src/components/input/gaze/`).
3. Sign proof of concept with a small vocabulary (`src/components/input/sign/`). Call it a proof of concept.

Every channel emits `SelectEvent` (see `docs/API.md`, Input channels, and `src/lib/contracts/input.ts`).
The frontend renders options as large targets and listens for `select`, so channels plug in without changing the flow.
ICU and sign are stretch: if the core flow slips, cut them first.

## Shared pieces
Built once in the first PR and then frozen:
1. Zod contracts in `src/lib/contracts/` (from `docs/API.md`).
2. `src/lib/server/llm.ts`: `callModel({ system, user })`, written by Backend 1. The provider code lives behind it in `src/lib/server/providers/` (Anthropic first), chosen by the `LLM_PROVIDER` and `LLM_MODEL` env vars. Routes import only `callModel`, never a provider SDK, so switching models is a config change plus one new adapter file. Keep prompts model-neutral (plain instructions, strict JSON validated by zod).
3. `redact(text): { text: string; count: number }` in `src/lib/server/redact.ts`, written by Backend 1.
4. Dependencies (`@anthropic-ai/sdk`, `zod`) added by Backend 1 in that first PR. Others leave `package.json` and the lockfile alone. Backend 2 asks before adding a gaze or hand-tracking package.
5. Fixtures: `src/lib/server/fixtures/stories.ts`, 3-4 synthetic stories in several languages. Read-only after creation.
6. API keys (`ANTHROPIC_API_KEY` for now, plus `LLM_PROVIDER` and `LLM_MODEL`) go in your own `.env` (gitignored); document the variable names in `.env.example`. Get a key at console.anthropic.com (separate from a claude.ai subscription; needs billing or credits). Never commit or paste a key.
7. When the model changes, rerun the fixture stories in several languages as a regression check, and read the new provider's data retention terms first.

## Git rules
- Never commit to `main`. One branch per task: `<name>/<task>`. Small PRs, merged within hours.
- `git pull --rebase origin main` before you start and before you push.
- One agent per checkout. For parallel agents on one laptop: `git worktree add ../al-<task> <branch>`.
- No force-push or `reset --hard` on shared branches.
- Shared files (`package.json`, lockfile, `layout.tsx`, `globals.css`, `AGENTS.md`, this file): minimal change, say so in the commit.
- Teammates review each other's PRs. Check the diff only touches that author's lane.
- Merge order: contracts and shared pieces first, then the pipelines in whichever order they finish.

## Prompting an agent
Name the lane and the files in the prompt. Example:
> Implement only `src/lib/server/translate/**` and `src/app/api/translate/`. Do not edit contracts, `llm.ts`,
> `package.json`, or respond/redact files. If you need a change there, stop and tell me.

Input channels example:
> Implement only `src/components/input/body-diagram/`. It takes `regions` and emits a `RegionId` using the types in
> `src/lib/contracts/input.ts`. Tap only for now. Do not edit pages, API routes, or other components.

Tell the agent to parse its output with the zod schema in a test so contract drift is caught immediately.

## Handoffs: how an agent picks up where another left off
Agents have no memory between sessions. Anything that must survive goes in files:
- **`docs/TASKS.md`:** who owns each task, its branch, and its status. Claim a row before you start.
- **`docs/HANDOFF.md`:** a short log. Every session ends with a new entry: what is done, what is next, anything blocking, and files touched. Newest first.
- **PR descriptions and `git log`:** the PR says what changed and what is left.

**Start of session (human or agent):**
1. `git pull --rebase origin main`; read `AGENTS.md`, `docs/TEAM.md`, `docs/TASKS.md`, and the top of `docs/HANDOFF.md`.
2. Check `git log --oneline -15` and open PRs (`gh pr list`).
3. Confirm your lane and the files you may edit before changing anything.

**End of session:**
1. Run `npm run typecheck` and `npm run lint`, and the tests for your area.
2. Commit and push your branch; update your row in `docs/TASKS.md`.
3. Add an entry to the top of `docs/HANDOFF.md` using its template.

## Privacy rules (everyone)
No stored patient data, no identifiers collected or sent, no logging of request or response bodies, and never claim
"HIPAA compliant". Details in `docs/PRODUCT.md`.
