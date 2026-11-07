# Frontend mocks (src/lib/mocks)
Owned by Frontend. Stand-ins for Backend 1's routes so the session flow at `/start` works before the API exists.

- `types.ts`: draft types copied from `docs/API.md`. When the zod contracts land in `src/lib/contracts/`, import those and delete this file.
- `index.ts`: `mockTranslate` (POST /api/translate), `mockRespond` (POST /api/respond), `mockMetrics` (no-op). They add ~0.7–1.1s latency and mimic the planned redaction (phone/email masked, count returned, values never).
- `data.ts`: synthetic question bank, tap-phrases for patients who cannot speak, clinician quick replies, demo translations (en, es, ar, zh-Hans). Demo phrases only; a fluent speaker must review them.
- `auth.ts`: clinician accounts mock (sign up, sign in, Google, forgot password, profile, sign out). Keeps only the signed-in clinician's own profile in localStorage; never passwords, never patient data. The UI reaches it only through `src/components/auth/api.ts`.
- Failure path: put `#fail` in any patient input or clinician message to get a 502-style `MockApiError` and test the typed-fallback UI.

Rules:
- The UI must call the mocks only through `src/components/session/api.ts`. Backend: when your route is ready, change that one file to `fetch()` your route and keep the response shape identical to `docs/API.md`.
- Backend agents: do not edit this folder; build the real routes in `src/app/api/**` against `docs/API.md`. Tell Frontend if a contract changes.
- Synthetic data only. No names, IDs, or other identifiers in mock data. Nothing here is stored or logged.
