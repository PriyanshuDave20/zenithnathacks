# Backend lane (src/lib/server)
Backend only. Do not edit pages or components. Match `src/lib/contracts` exactly and parse outputs with the zod schemas in tests.
Shared pieces (`llm.ts`, `providers/`, `redact.ts`, contracts, fixtures) change only by small PR; tell the team first.
Routes call `callModel` from `llm.ts` only, never a provider SDK directly (we will switch models later). Keep prompts model-neutral.
Never store patient data, log request/response bodies, or handle identifiers. See `docs/TEAM.md` and `docs/HANDOFF.md`.
