# Resume plan: real clinician accounts and frontend metrics

Status: **planning recorded; implementation has not started**. Prem asked to save
this plan before starting because his session usage limit was running low.

## Resume entry point

Read `AGENTS.md`, `docs/TEAM.md`, `docs/TASKS.md`, the newest `docs/HANDOFF.md`
entries, this plan, and `docs/API.md` before editing. Inspect Git/GitHub status and
sync main. This documentation is on **`prem/auth-metrics-plan`**, originally based
on main **`655af89`** (merged PR #43). Do not assume this is still the newest main.
There are no auth/metrics-integration source changes or active implementation
worktrees to recover from this planning session.

Suggested new-session prompt:

> Continue Prem's real clinician authentication/profile persistence and frontend
> metrics integration using `$synapse-backend-team`. Read
> `docs/AUTH_METRICS_PLAN.md`, the newest handoff and task board first. Preserve
> `.env`, generated audio and the latest frontend work. The previous session only
> investigated and saved the plan; do not claim implementation is already done.

## User intent and scope

- Prem is Backend 1. His latest implementation request refers to both remaining
  items: wiring frontend metrics and replacing mock clinician authentication with
  a real backend/PostgreSQL-backed clinician profile.
- Use `synapse-backend-team`: scoped implementer in an isolated worktree, then an
  independent reviewer at a pinned integrated candidate. At most two subagents;
  do not copy `.env` or credentials into worktrees. Coordinator owns shared
  setup, integration, task/handoff documentation and remote Git operations.
- Backend code stays in `src/app/api/**` and `src/lib/server/**`. This request also
  requires narrowly scoped frontend adapters/event hooks/server auth gates and
  clinician-only schema/config/dependency changes. Assign those exact paths
  explicitly; the team skill alone is not cross-lane authorization. Preserve
  existing layouts, styles, accessibility, input/gaze algorithms and speech work.
- No patient tables/profiles/history/messages or persisted patient/session
  content. Clinician profiles and authentication/session/OAuth/reset records are
  allowed for clinician accounts only. No request/response body logging or secrets
  in chat/commits. Do not attach clinician IDs to anonymous metrics.

## Confirmed current state

- PR #40 (guided Azure summary clip sequencing) and PR #41 (Backend 1 metrics)
  are merged. PR #42 added Eye auth-boundary clearing and truthful speech feedback.
  Main was subsequently synced through PR #43 (dashboard/device settings,
  accessibility and new pain slider). Preserve all of them.
- `/api/metrics` already exists. It validates the existing strict schema, accepts
  all three events/five modes, returns empty 204, has a 1 KiB body cap and generic
  no-store errors. Its memory-only sink uses fixed counts/coarse timing buckets.
  See `docs/METRICS.md`. **Do not rebuild it or replace it with PostgreSQL.**
- `src/components/session/api.ts` exports `track()` but it is a no-op. The legacy
  `session-app.tsx` has event calls; the live `communication/workspace.tsx` lacks
  metrics instrumentation. Implementing only `track()` is insufficient.
- `src/components/auth/api.ts` is the intended UI integration seam. It wraps
  `src/lib/mocks/auth.ts` and exports `USING_MOCK_AUTH = true`, sign-in/up/out,
  Google sign-in, password-reset request, profile update and `useClinician()`.
  Preserve its patient/Eye/gaze clearing on successful auth boundaries/sign-out.
- Dashboard, profile, sign-in/up and forgot-password UIs exist. `/start`,
  `/dashboard`, `/profile` and `/icu` have client `RequireClinician` gates; these
  are UX gates, not real server authorization. Inspect every live entry point.
- Prisma 7 is already configured for PostgreSQL through `src/lib/db.ts` and
  `prisma.config.ts`. The schema currently contains only scaffold `Example`.
  Preserve existing data/tables; do not reset/recreate the shared database.
- No auth library is installed. Existing versions: Next 16.4.3, React 19.3,
  Prisma/client/adapter 7.10.1. Preserve the Prisma major version.
- A presence-only environment check found `DATABASE_URL` configured. The expected
  auth secret/base URL, Google OAuth and email-provider variable names checked
  were absent. No values were printed; no connection/read/write was attempted.
  A present URL is **not** proof that the database is reachable or provisioned.

## Work package 1: frontend metrics

Create a small task branch/PR independently of auth if practical.

1. Replace the `track()` no-op with a nonblocking same-origin POST to
   `/api/metrics`. Validate/project only the existing allowed fields. Use no-store
   and omit credentials; handle empty 204 without JSON parsing. Swallow failures
   without logging payloads, showing patient errors or blocking the conversation.
   No event queues, localStorage, identifiers, background retries or new sink.
2. Instrument the live workspace at explicit lifecycle transitions, not render
   effects: session start, first patient message actually shared/confirmed, and
   affirmative teach-back. Decide/document the exact start/first-message moment
   consistently before coding. Include the existing untranslated-share fallback.
3. Keep only local memory timing/once-flags. Clear/reset them on a deliberate new
   session, clear/expiry and navigation cleanup. Prevent double-click/retry/render
   duplication within the active client flow; the server does not deduplicate.
4. Audit legacy calls to avoid duplicate events. Eye mode has a separate workflow;
   document its event mapping or coordinate a narrow explicit assignment rather
   than silently omitting it or editing gaze/input logic. Existing schema accepts
   `icu`, but that alone does not instrument the Eye flow.
5. Update the existing test asserting that metrics never fetch. Add meaningful
   transport/lifecycle coverage and phone-size browser checks with synthetic data.
   Confirm request bodies contain only event/mode/optional duration and failure
   does not affect patient workflow. Update `docs/METRICS.md` when wired.

Likely paths: `src/components/session/api.ts` and its tests,
`src/components/communication/workspace.tsx`, possibly a small in-memory lifecycle
helper/test and explicitly scoped Eye flow hooks. Reinspect current main first.

## Work package 2: real clinician auth and profiles

Use the draft account contract in `docs/API.md` (Clinician accounts):

- POST `/api/auth/signup`, POST `/api/auth/signin`, POST `/api/auth/signout`.
- GET `/api/auth/google` and OAuth callback, same-site relative redirect only.
- POST `/api/auth/forgot-password` -> generic 204, no enumeration.
- GET `/api/me` -> own ClinicianProfile or 401; PATCH `/api/me` -> own profile.
- Preserve profile shape: id/email/name/role/clinic/languages, read-only plan and
  password/google provider. No client-supplied account ID, plan elevation or
  update of another clinician. Add a reset-token completion route/UI if required
  to make the existing forgot-password flow actually complete; document that
  additive contract in a small reviewed change.

Implementation order:

1. Select a maintained auth library before coding. **Better Auth + Prisma is a
   researched recommendation, not an installed/finalized choice.** Official docs
   support Next route handlers, Prisma, email/password and Google. Prefer built-in
   session/CSRF/OAuth/password handling over hand-rolled authentication. Recheck
   current docs and pin a compatible release. The draft API mentions argon2/bcrypt;
   resolve any mismatch with the selected library's default hashing explicitly.
2. Pin acceptance criteria and exact worker file ownership. Coordinator handles
   minimal dependency/lockfile changes, schema setup and integration; the backend
   implementer owns assigned auth logic/routes/tests. Keep shared contract changes
   small and documented; do not silently replace existing public request shapes
   with the auth library's native endpoints.
3. Design additive clinician/auth tables only. Review schema changes before any
   push, inspect database connectivity safely with a read-only query, and follow
   the one-person `db:push` protocol. Do not use destructive reset/accept-data-loss
   commands. Generate the Prisma client after schema changes.
4. Implement validated, bounded, generic no-store routes. Use httpOnly sessions,
   Secure cookies in HTTPS deployments, SameSite protection, expiry/revocation,
   CSRF/origin checks, safe redirects, password hashing and auth rate limiting.
   Keep tokens/hashes/secrets out of profile responses and logs. Use trusted
   configuration for origins; do not trust arbitrary request Host/redirect input.
5. Persist clinician profile edits in PostgreSQL and read them through the current
   `@/lib/db` singleton. Do not store patient language/mode/contrast defaults in
   clinician profiles: PR #43 deliberately keeps those per visit. Preserve device
   and summary preferences already implemented.
6. Swap the frontend auth adapter to real fetch/session state. Do not trust or
   automatically migrate old localStorage mock accounts. Preserve refresh,
   cross-tab sign-out, current Eye/gaze/speech cleanup and safe `next` behavior.
   Remove/update demo-only UI claims only when the real flow is available.
7. Add real server authorization for protected pages and relevant APIs using the
   selected library and installed Next docs (Cache Components is enabled).
   A client gate or cookie-presence redirect alone is insufficient. Ensure private
   profile responses are never cached across clinicians.
8. Complete Google and reset-email paths with actual provider configuration when
   supplied. Missing credentials must produce clear unavailable/setup behavior,
   not fake Google sign-in or a false claim that email was delivered. Do not send
   test emails to real recipients without explicit authorization.

External setup still needed/unknown:

- Safe auth secret generation and trusted app base URL, without overwriting `.env`.
- Reachable intended PostgreSQL database and reviewable additive schema.
- Google OAuth client/secret, consent/test-user setup and exact callback URLs.
- Password-reset email provider/sender/domain setup; no provider selected yet.
  Do not provision a paid service or expose credentials. Implement offline/mocked
  paths while setup is pending and report real-service verification gaps honestly.

Relevant existing files: `src/components/auth/api.ts`, `src/lib/mocks/auth.ts`,
`src/components/auth/{signin,signup,forgot-password,profile,require-clinician}.tsx`,
`src/app/{start,dashboard,profile,icu}/page.tsx`, `src/lib/db.ts`,
`prisma/schema.prisma`, `prisma.config.ts`, package manifests and `.env.example`.
New auth logic should live under `src/lib/server/auth/**`, routes under
`src/app/api/auth/**` and `src/app/api/me/**`. Treat this as a candidate scope to
refine before assigning, not permission for unrelated edits.

## Verification, independent review and delivery

- Use synthetic clinicians and mocked HTTP/offline fixtures first. Workers never
  read/copy `.env`, call live Azure/NVIDIA, seed real users or alter the shared DB.
- Test signup/signin failures, wrong password/unknown-email equivalence, sessions
  across refresh, expired/revoked sessions, sign-out, ownership checks, profile
  field allowlisting, CSRF/origins/redirects, password-reset expiry/single-use,
  OAuth state/callback validation, and no token/body leakage or cross-user cache.
- Browser-check 390px plus desktop: signup/signin -> dashboard -> profile edit ->
  reload -> deliberate new session -> patient workflow -> sign-out. Verify old
  patient/Eye content cannot survive a clinician account boundary. Use a separate
  test browser; do not overwrite Prem's real browser account or mock data.
- Run tests, typecheck, lint and production build on the integrated candidate.
  Planning baseline at `655af89`: 184 tests, typecheck and lint pass (0 errors;
  188 existing bundled-skill warnings). Reestablish the baseline if main advances;
  these checks do not prove any future auth/integration code works.
- With Cache Components, verify runtime-dependent auth routes are not accidentally
  prerendered and credential absence at build time is handled deliberately.
  Turbopack workers require approved local port/process access here; if a sandbox
  failure is cached, move only generated `.next/cache/turbopack` to a task temp
  directory before retrying. Preserve the existing dev server when possible.
- Pin the candidate SHA in a separate reviewer worktree. Independent reviewer
  checks actual source/contracts/privacy and safe tests; coordinator resolves
  findings and performs any authorized real-service smoke checks. Record limits.
- Update TASKS/HANDOFF and setup docs, commit/push task branches, open small draft
  PRs. No automatic merge or deployment. Distinguish implemented code from live
  provider activation; missing Google/email setup must remain visible.

## Reference material already consulted

- Project-local `.agents/skills/synapse-backend-team/SKILL.md`.
- Available auth integration skill (`vercel:auth`) and local Prisma setup/client
  skills. Preserve Prisma 7; do not upgrade it as a side effect.
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next),
  [Prisma adapter](https://better-auth.com/docs/adapters/prisma),
  [email/password](https://better-auth.com/docs/authentication/email-password),
  [Google](https://better-auth.com/docs/authentication/google).

These references were read during investigation; no package install, schema edit,
DB write, auth secret generation, OAuth/email setup or source implementation ran.
