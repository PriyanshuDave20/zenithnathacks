# Tasks

Update your row when you start/finish something. Most owners are still TBD: claim a row by putting your name and branch on it.
Time budget: 64 hours total. See `docs/PRODUCT.md` for scope and `docs/API.md` for contracts.
Lanes (details in `docs/TEAM.md`): Frontend (Claude) owns `src/app/**` and `src/components/**` except `input/`.
Backend 1 (Codex) owns `src/app/api/**`, `src/lib/server/**`, `src/lib/questions/`.
Backend 2 (Codex, input channels) owns `src/components/input/**` and `src/lib/input/**`.
In the Lane column below, "Backend" means Backend 1 unless it says Backend 2.

| Task | Lane | Owner | Branch | Status |
|------|------|-------|--------|--------|
| Eye mode naming and current landing-page examples | Frontend | Zach / Codex | zach/eye-mode-showcase | Implemented: automatic gaze demo with cursor/dwell/confirmed clinician choice, camera-free playback and reduced motion; merged zenith/gaze-tracking; Eye selected in clinician setup; typecheck and 64 tests pass; webcam/visual recheck pending |
| Session confirmation, voice clear and patient read-back polish | Frontend | Zach / Codex | zach/session-ui-fixes | Done: legible end/clear confirmation, voice transcript reset, message retained during read-back loading, compact inline intake actions; mobile/desktop browser checks and 64 tests pass |
| Landing demo accuracy and responsive polish | Frontend | Zach / Codex | zach/session-ui-fixes | Done: all five modes, six workflow previews, hero and privacy reviewed; body overflow, summary accuracy and mode icons fixed; checks pass |
| Combine PRs #15, #16 and #18 | Integration / all three PR scopes | Zach / Codex | zach/combined-prs | Done: exact source heads merged, source implementations retained, 81 tests/typecheck/lint and browser guided flow pass |
| Frontend audit repairs (13 findings) | Frontend + input UI | Zach / Codex | zach/frontend-audit-fixes | Done: all 13 frontend findings repaired; typecheck, 83 tests, lint and focused browser regressions pass |
| **Done** | | | | |
| Repository sync, project orientation, shared skills and baseline verification | Tooling / docs | Zach / Codex | zach/setup-verification | Done: main current; all 13 project skills present; typecheck and 22 tests pass; lint 0 errors |
| Scaffold, agent skills, landing page | Both | Prem | prem/landing-hero | Done |
| Remove pre-event example landing page; blank app shell; rename to Synapse | Frontend | Zach | zach/fresh-start (PR #4) | Done |
| Product scope, ML plan, API draft, team protocol, beginner guide, handoff log | Both | Prem | prem/product-scope-v2 (PR #3) | Done |
| Update scope and lanes: two intake paths, Backend 1 / Backend 2 split, `src/lib/contracts/input.ts` types | Both | Prem | prem/team-lanes-v2 (PR #7) | Done |
| Medical jargon database (not yet reviewed against the question bank or prompts) | Backend | Akash | Akash-Medical-Jargon-Database (PR #6) | Merged, needs review |
| Switch site to Akash's new "S" logo (vectorised two-tone component) | Frontend | Zach | zach/start-flow (PR #12) | Done |
| 3D emblems on the home page: Rod of Asclepius in the hero, extruded Synapse "S" in the closing band | Frontend | Zach | zach/3d-emblems (PR #14) | Done, merged |
| Home page phone: Akash's 3D iPhone model, one phone pinned (CSS sticky) on the right through hero, steps, modes and privacy on desktop; in-flow phones on mobile | Frontend | Zach | zach/3d-phone (PRs #20, #21); zach/home-finish-fixes (PR #22) | Done, merged; finish review: ship |
| Clinician accounts UI: sign in (Google + email), sign up, forgot password, profile; sign-in required before `/start` (on a mock) | Frontend | Zach | zach/clinician-auth (PR #16) | Done, merged (impeccable seed waiver for the auth pages still pending) |
| Clinician accounts backend: auth routes, sessions, Google OAuth, `Clinician` table (see `docs/API.md`) | Backend | TBD | | Todo |
| Infrastructure overhaul (scope to be confirmed with Zach); graphify graph kept outside the repo | Tooling / docs | Claude (next session) | TBD | Handed over 2026-11-07, not started: see top of `docs/HANDOFF.md` |
| Searchable patient-language picker (setup search + in-session dropdown), data-driven so more languages can be added | Frontend | Zach / Claude | zach/language-search | Done: no new languages; see HANDOFF for how to add one |
| **Phase 1: Contracts & foundation (~8h)** | | | | |
| Foundation: Zod contracts matching `docs/API.md`, `llm.ts` with mock provider (no model SDK/key), redaction + tests, question-bank skeleton, synthetic fixtures | Backend 1 + shared contracts | Prem / Codex | prem/backend-foundation (PR #18) | Done, merged; no API routes or real-provider integration |
| Mocks in `src/lib/mocks/` matching the contracts | Frontend | Zach | zach/start-flow | Done (see `src/lib/mocks/AGENTS.md`) |
| Mobile-first design direction + shared UI components (large buttons, high contrast, pictograms) | Frontend | Zach / Codex | zach/shared-design-system | Done: shared primitives, named shape/type tokens, field treatment and reuse docs; finish review ship |
| Model-neutral prompts: translate + structure, simplify clinician reply, no-identifier rules (test on 3-4 stories, several languages) | Backend 1 | Prem / Codex | Original APIs merged; prem/nemotron-provider / prem/guided-language-packs follow-up | 4 multilingual mock fixtures pass; NVIDIA live synthetic output/schema smoke passed; clinical/language/adaptation evaluation pending |
| Question bank skeleton in `src/lib/questions/` (ids, options, pictograms, region mapping) | Backend | Prem / Codex | prem/backend-foundation (PR #18) | Done, merged: all 17 history questions; English-only draft, clinical/language review pending |
| Input channel contract `src/lib/contracts/input.ts` (`SelectEvent`, `RegionId`) | Backend 2 | TBD | | Todo (types drafted) |
| Landing page `/` (meuze.ai-level quality, Synapse theme): workflow showcase + Start button to a separate start page | Frontend | Zach | zach/landing-page (PR #10, merged) | Done: finish review passed (ship); `/start` is a placeholder |
| **Phase 2: Core flow (~28h)** | | | | |
| Preserve nonclinical speech translations when provider duration is absent/null | Backend 1 | Prem / Codex | prem/guided-language-packs (PR #16) | Fixed on branch: Spanish library-question regression; 81 tests after upstream sync, live route and clinician-view check pass |
| Nemotron translation provider (native HTTP, synthetic demos only) | Backend 1 / shared provider | Prem / Codex | prem/nemotron-provider (PR #15, new repo) | Done on branch: native NVIDIA adapter; live synthetic intake/reply smoke passed en/es/ar/zh-Hans; mock default for clones, no SDK |
| Guided language packs and deterministic English reports, no runtime model calls | Backend 1 / frontend integration | Prem / Codex | prem/guided-language-packs (stacked on PR #15) | Done on branch: 17 questions/options in cached es/ar/zh-Hans draft packs; canonical /10 bedside flow, deterministic reports; clinical/fluent review pending |
| Wire frontend adapter to translate/respond API routes; preserve guided answer meaning | Backend 1 / frontend integration | Prem / Codex | prem/frontend-api-wiring (PR #12, new repo) | Merged; guided-language follow-up keeps choices as IDs and uses one canonical /10 question bank |
| Communication workspace overhaul from system specification / ASCII wireframe | Frontend | Zach / Codex | zach/communication-overhaul | Done: clinician-led language/mode setup (ICU first-class), explicit patient handoff, focused original intake, read-back, clinician workspace/dual summaries, reply and teach-back handoffs; frontend-only ICU local review; mocks/backend/config unchanged; review fixes resolved |
| Stage flow shell (start, intake, handoff, review, response, end) + clear-session + idle timeout | Frontend | Zach | zach/start-flow (PR #12) | Done (finish review: ship) |
| Patient intake: mode/language selection, two paths (free-form speech/text, guided questions), voice (Web Speech) with typed fallback, pictograms | Frontend | Zach | zach/start-flow | Done (on mocks; body diagram slot for Backend 2) |
| Body diagram component with tap selection, emits `RegionId` | Backend 2 (built by Frontend at Zach's request) | Zach / Claude | zach/body-diagram | Done: front/back tappable diagram, 41 parts (multi-select) mapped to `RegionId`; wired into guided "Where"; real API wiring must send `regionOf(partId)` or Backend 1 accepts part ids |
| Mode: Deaf/HoH (captions, large text, tap responses) | Frontend | Zach | zach/start-flow | Done (first pass) |
| Mode: low-literacy (stepwise, pictograms, read-aloud) | Frontend | Zach | zach/start-flow | Done (first pass) |
| Mode: mute (taps/typing + text-to-speech) | Frontend | Zach | zach/start-flow | Done (first pass) |
| Clinician review screen: structured summary, original text, back-translation | Frontend | Zach | zach/start-flow | Done |
| Clinician response step + teach-back tap | Frontend | Zach | zach/start-flow | Done |
| `POST /api/translate`: translate + structure free-form and guided input, back-translation, redaction pass | Backend 1 | Prem / Codex | Original route merged; prem/guided-language-packs follow-up | Follow-up: free text/transcripts use configured provider; guided reports are deterministic with no model calls; runtime caches only static question wording |
| `POST /api/respond`: simplify clinician reply to the patient's mode and level | Backend 1 | Prem / Codex | Original route merged; prem/nemotron-provider follow-up | Configurable NVIDIA native HTTP provider; validated/redacted replies and API teach-back wired; clinical/language/adaptation review pending |
| Anonymous metrics (time to first message, mode, teach-back confirmed); no content | Backend 1 | Prem / Codex | | Next Backend 1 task, not started: `/api/metrics` against existing schema; decide anonymous aggregation/sink behavior before implementation |
| **Phase 3: Demo & polish (~20h)** | | | | |
| Home-page snake climb → header heartbeat animation | Frontend | Zach / Codex | zach/continuous-pulse | Done: larger detailed centered emblem, blended unfolding trail, live ECG and top/right progress; Pause/Play and reduced motion supported |
| Two synthetic personas + canned demo script | Both | TBD | | Todo |
| Phone-viewport testing, accessibility pass, bug fixes | Both | TBD | | Todo |
| Pitch slides; verify every statistic against its source before use | Both | TBD | | Todo |
| **Stretch (in order)** | | | | |
| ICU mode: webcam eye-gaze dwell-to-select (calibration, large targets), wired to body diagram and narrowed questions | Backend 2 | zenith / Claude | zenith/gaze-tracking | First pass done: opt-in site-wide gaze; calibration v3 (30-second pursuit sweep, iris-height + aperture + pitch cues, ridge fit) after a live-webcam round fixed vertical movement and rigidity; integrated on zach/eye-mode-showcase with roll-aware features, blink/invalid-sample rejection, stricter calibration, fresh-frame dwell, look-away rearm and recalibration; real-webcam re-check, body-diagram/question narrowing and offline assets still todo |
| Full back-and-forth conversation (turn-taking, speaker control) | Both | TBD | | Todo |
| Sign proof of concept: small vocabulary via on-device hand tracking (not full sign translation) | Backend 2 | TBD | | Todo |
| Patient joins from own phone via QR | Both | TBD | | Todo |
