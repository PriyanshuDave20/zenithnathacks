# NatHacks 2026 — Agent Instructions
(Read by Codex natively; Claude reads it via CLAUDE.md.)

## Project
Synapse: a translation and communication bridge for clinics, used by doctors and nurses on their own device (the patient installs nothing). Patients describe symptoms by voice, text, or pictograms in their own language and mode (other language, Deaf/HoH, low literacy, mute); the app translates and structures it for the clinician via an LLM (Claude for now, behind `src/lib/server/llm.ts` so the model can be swapped). Intake is free-form speech or a guided question sequence. ICU eye-gaze with a body diagram and a small-vocabulary sign proof of concept are stretch. It is a communication aid, not a diagnostic tool or certified interpreter; demo uses synthetic data only. Web app, mobile-first. Scope and decisions: `docs/PRODUCT.md`; contracts: `docs/API.md`; task board and lanes: `docs/TASKS.md`.

## Privacy rules (all agents)
- Never store patient data: no patient/visit/message tables, no patient profiles. Session state is browser memory only. Clinician accounts (the clinician's own profile only) are allowed; see `docs/PRODUCT.md`.
- Never collect or send identifiers (names, IDs, DOB, phone, address). Do not log request/response bodies.
- Prompts must instruct the model to omit identifiers. Do not claim "HIPAA compliant" in code, UI, or docs.

## Session protocol (full detail in `docs/TEAM.md`)
- Start: `git pull --rebase origin main`; read `docs/TASKS.md` and the top of `docs/HANDOFF.md`; check `git log` and `gh pr list`; confirm your lane before editing.
- End: run typecheck/lint/tests, commit and push your branch, update your row in `docs/TASKS.md`, and add an entry at the top of `docs/HANDOFF.md`.
- You have no memory between sessions: anything the next agent needs must be in those files, the PR, or the commit history.

## Lanes (stay in your lane)
- Frontend (Claude): `src/app/**` pages, `src/components/**` except `input/`, styles. Build against `src/lib/mocks/`.
- Backend 1 (Codex): `src/app/api/**`, `src/lib/server/**`, `src/lib/questions/`. Match `src/lib/contracts/` exactly.
- Backend 2 (Codex, input channels): `src/components/input/**`, `src/lib/input/**`. Browser only; emit `SelectEvent`; camera video never leaves the device.
- Contracts (`docs/API.md`, `src/lib/contracts/**`): change by small PR only, tell the team first.
- A lane is a set of folders, not a job title. Full detail: `docs/TEAM.md`.

## Stack
TypeScript, Next.js (App Router, `src/`), React, Tailwind CSS v4, Prisma 7 ORM, PostgreSQL (shared hosted DB).
Design mobile-first: build for ~390px width first, then scale up. Test in a phone-sized viewport.
Prisma client is generated to `src/generated/prisma` (gitignored); import the singleton from `@/lib/db`.
A Python backend may be added later; if so it lives in `api/` and contracts go in `docs/`.

## Commands
- `npm install` (also runs `prisma generate`)
- `npm run dev` — dev server; `npm run build`; `npm run lint`; `npm run typecheck`
- `npm run db:push` — sync schema to the DB (hackathon mode, no migration files); `npm run db:studio`
- Schema changes: edit `prisma/schema.prisma`, tell the team, one person pushes at a time.

## Team workflow (multiple laptops + multiple agents)
- Never commit to `main` directly. One branch per person/task: `<name>/<short-task>`.
- `git pull --rebase origin main` before starting work and before pushing.
- Small, frequent commits and PRs. Merge quickly; long-lived branches cause conflicts.
- Stay inside your assigned area/files. If you must touch shared files
  (package manifests, lockfiles, config, this file), keep the change minimal and say so in the commit.
- Never commit secrets. Use `.env` (gitignored); document new vars in `.env.example`.
- Record decisions and API contracts in `docs/` so other people's agents see them.
- Don't run destructive git commands (force-push, reset --hard) on shared branches.

## Code graph (graphify, optional, local only)
- The graphify knowledge graph lives OUTSIDE the repo: `~/.graphify/zenithnathacks/graphify-out/graph.json` (AST-only build of `src/`, no LLM cost). Never write `graphify-out/` into the repo.
- Query instead of reading many files: `graphify query "<question>" --graph ~/.graphify/zenithnathacks/graphify-out/graph.json --budget 1500`.
- Rebuild steps are in the top `docs/HANDOFF.md` entry that mentions graphify. The graph is per machine; teammates without it just use grep.

## Task board
Active tasks and owners live in `docs/TASKS.md`. Update it when you start/finish something.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
