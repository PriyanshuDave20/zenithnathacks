# Handoff Log

Newest entry first. Add one at the end of every work session (human or agent). Keep each entry short and factual.
Do not put secrets or patient data here.

## Template
```
### YYYY-MM-DD HH:MM  <name> / <tool>  <branch>
- Done: what works now
- Next: the single most useful next step
- Blocked / needs: decisions, other lanes, missing contracts
- Touched: key files (note any shared files)
- Notes: gotchas the next person would otherwise rediscover
```

## Entries

### 2026-11-07  Prem / Codex  prem/backend-api-handoff (session wrap-up)
- Done: foundation PR #18, documentation PR #19, translate API PR #27, and respond API PR #29 are all merged into main. Both handoff conflicts were resolved by preserving every branch's entries and prior history. Task board now marks both API routes/prompts merged; no runtime changes in this wrap-up.
- Current behavior: `/api/translate` resolves guided labels and returns canned synthetic translations or explicit unavailable responses. `/api/respond` returns patient text, read-aloud text and teach-back for one canned reply in four languages, or explicit unavailable responses. Both are stateless, schema-validated, redact before/after the model, use generic errors and `no-store`, and do not log/store message content. Frontend session/auth screens still use their separate mocks.
- Provider constraint: keep `LLM_PROVIDER=mock` (the default). No model SDK, API key, live adapter or database is needed for these routes. Mock fixtures do not implement or validate general translation, mode adaptation or reading-level adaptation. Redaction is best effort with known names/addresses/date-format gaps; synthetic data only.
- Next session: sync main, read this entry plus `docs/TASKS.md`, `docs/API.md` and lane instructions, check open PRs, then create a new Backend 1 task branch for `/api/metrics`. Use existing `MetricsEventSchema` (event, mode, optional msSinceStart); no content, identifiers, request bodies or patient records in storage/logs. Decide anonymous aggregate/sink behavior before implementing; no metrics code is started or claimed as complete.
- Remaining coordination: frontend API wiring belongs to Zach's lane; reconcile question-bank severity 0–10 with frontend mock 1–5 before guided integration. Clinician authentication backend, clinical/fluent-speaker review, question translations/pictogram assets, and live-provider evaluation remain separate work. Do not edit frontend, mocks, input channels, contracts or foundation provider files as part of the next metrics task.
- Checked: typecheck, all 45 tests and `git diff --check` pass; lint has 0 errors and 188 existing warnings in bundled skill scripts. This wrap-up changes only `docs/TASKS.md` and `docs/HANDOFF.md`; previous entries below remain unchanged. Local `.graphifyignore`, `.impeccable/review/`, and ignored graphify outputs must stay excluded from commits.

### 2026-11-07  Zach / Codex  zach/continuous-pulse (larger emblem, blended origin)
- Done: increased staff to 58% of neighbouring phone height (290–400px), widened the helix, body and head; added front-coil highlights, clearer eye/head contour and a softly shaded 10px staff. Gap centering and existing page layout remain.
- Handoff: progress tail now unfolds backward from the snake’s arrival during the final transition, with a transparent-to-blue feathered origin instead of a solid prefilled bar appearing. Live ECG, clockwise top/right progress, Pause/Play, hidden-tab suspension and reduced-motion alternatives preserved.
- Checked: typecheck, 45 tests and lint (0 errors/188 existing bundled-skill warnings). Browser checked 1440x900, 1280x720, 390x844: larger emblem, handoff, trail, side, reduced motion and no overflow. Captures stay local; Graphify outputs remain ignored.
- Touched: home/heartbeat-journey.tsx; shared DESIGN.md, home surface brief, docs/TASKS.md and docs/HANDOFF.md.
- Next: review/merge PR #30 after approving the larger emblem and feathered transition.

### 2026-11-07  Zach / Codex  zach/continuous-pulse (live ECG and prefilled trail)
- Done: the ECG shape now sweeps cyclically within a fixed reading-position window, rather than only scaling. The header trace starts at the left edge, with its trail already filled to the staff entry on arrival; scroll continues clockwise around the top/right route.
- Controls/performance: existing Pause/Play demo also pauses/resumes the waveform. Hidden tabs suspend; reduced motion is static. The coiled-body route is skipped after docking; only the monitor redraws while live.
- Checked: typecheck, lint (0 errors/188 existing warnings) and 45 tests pass. Browser frame comparisons confirm live movement at fixed scroll, actual Pause demo freezes it, reduced motion stays static; mobile has no overflow. Finish review found only the old design note, updated with the new behavior.
- Touched: home/heartbeat-journey.tsx, home/hero-exchange.tsx; shared DESIGN.md, surface brief, docs/TASKS.md and docs/HANDOFF.md. Graphs/captures remain out of Git.
- Next: review the live waveform and arrival trail on the website.

### 2026-11-07  Zach / Codex  zach/continuous-pulse
- Done: refined the home-page staff’s fit: centered between text and phone, vertical placement follows both, height 42% of the phone (bounded 220–300px), compact helix/head and softly capped staff.
- One flow: snake shoots upward to the header directly above its staff. The heartbeat begins there, proceeds clockwise across the top-right corner (18px radius), then down the right edge (12px inset). No travel back to the top-left. Scroll progress advances along the same route and reverses upward.
- Preserved: one pinned phone, page content/layout, below-xl hidden emblem with direct perimeter fallback, static reduced-motion endpoints, event-driven idle rendering and short post-scroll pulse. Fonts/layout readiness remeasures placement; unmount guards deferred work.
- Checked: typecheck, 45 tests, lint (0 errors/188 existing skill warnings), geometry position/normal continuity and bounds across 10,000 samples at 3 sizes. Visuals at 1440x900, 1280x720, 390x844 cover staff, climb, launch, header entry, corner, side, reduced motion, return to top; no overflow. Finish reviewer disposition ship for this refinement.
- Touched: home/{heartbeat-journey,heartbeat-geometry,hero,phone-rail}; shared DESIGN.md, home surface brief, docs/TASKS.md and docs/HANDOFF.md. Graphify findings and captures remain local/ignored; no dependencies or backend edits.
- Next: review the continuous perimeter animation on the website and merge the branch when accepted.

### 2026-11-07  Prem / Codex  prem/respond-api (PR #29 handoff conflict resolution)
- Done: merged main into the published task branch; preserved both of Zach's animation entries, the respond-API entry, and all prior handoff history verbatim. No rewritten branch history; upstream frontend changes arrive unchanged.
- Checked: typecheck, all 45 tests and `git diff --check` pass; lint has 0 errors and the same 188 existing bundled-skill warnings. No unresolved conflicts; frontend/design files match main exactly.
- Touched: conflict resolution in shared `docs/HANDOFF.md` and PR #29 reference in the respond task row; no runtime implementation changes.
- Next: review/merge PR #29, then implement anonymous `/api/metrics` against its existing contract.

### 2026-11-07  Zach / Codex  zach/animation-lab (home-page integration)
- Done: per Zach’s correction, integrated the snake climb directly into the existing home-page HeartbeatJourney. Removed /animation-lab, its controls/components and its surface brief. Geometry now lives in src/components/home/heartbeat-geometry.ts.
- Motion: snake climbs a stationary pole and reaches the header; becomes a small heartbeat marking actual document progress. Scroll upward reverses it. Existing below-xl mobile fallback shows the progress trace directly; reduced motion uses static endpoints. Pulse settles 700ms after scrolling; rendering rests when idle and pauses in hidden tabs.
- Checked: desktop 1440x900 and mobile 390x844, climb/depart/dock/progress, return to top, reduced motion, no horizontal overflow; deleted route returns 404. Typecheck and all 33 tests pass; lint 0 errors/188 existing bundled-skill warnings.
- Touched: home/heartbeat-journey.tsx, heartbeat-geometry.ts and site-header.tsx; removed lab files; shared DESIGN.md, home surface brief, docs/TASKS.md and docs/HANDOFF.md. Graphify artifacts and screenshots remain excluded.
- Next: review the integrated animation on the website; PR scope is now the production home-page animation, not a separate testing environment.

### 2026-11-07  Zach / Codex  zach/animation-lab
- Done: pulled main through cd22a35 and created a dedicated animation-testing branch. Visit /animation-lab (noindex, not linked in production navigation). Home page and its existing HeartbeatJourney remain unchanged pending experiment approval.
- Motion: stationary pole, geometric helix with front/back occlusion, head-led climb and curved departure to the header. Physical-length sampling prevents sideways body stretching; the snake narrows into a small header heartbeat tied to page progress.
- Controls: replay/pause, 0.25x/0.5x/1x speed, exact timeline and progress scrubbing, real-scroll test page, optional resting heartbeat. Reduced motion renders static endpoints and disables playback/pulsing. Hidden tabs pause; static canvas rendering is event-driven.
- Checked: typecheck and all 33 tests pass; lint 0 errors/188 existing bundled-skill warnings. Geometry join continuity/finite coordinates/heartbeat endpoints pass. Browser checks at 390x844 and 1440x900: five stages, pause holds, scroll bottom 100% and top reset, reduced motion and no overflow. Idle instrumentation: 0 slot layout reads in 250ms versus 15 while pulsing.
- Review: Impeccable finish review requested two fixes (idle RAF and reduced-motion status); both scored resolved, disposition ship at that scope. Captures in local .impeccable/review/; Graphify findings saved in ignored graphify-out/, no graphs tracked.
- Touched: src/app/animation-lab/page.tsx; src/components/animation-lab/{animation-lab,snake-preview}.tsx and journey-geometry.ts; surface brief; shared DESIGN.md, docs/TASKS.md, docs/HANDOFF.md. No dependencies, API, storage, or home-page edits.
- Next: Zach tries the lab, tunes the visual motion, then explicitly adopts the approved sequence into the production home page.

### 2026-11-07  Prem / Codex  prem/respond-api
- Done: stateless `POST /api/respond` and reply pipeline using the existing request/response schemas and mock-only `callModel`. Returns `patientText`, `readAloudText`, and `teachBackPrompt`. Model-neutral prompt specifies patient language, reading level and mode, preserves clinical meaning/numbers/negation, and prohibits identifiers, diagnoses and invented advice.
- Privacy/errors: best-effort redaction before the model and on all three returned fields; no stored content, request state, or body logging. `Cache-Control: no-store` on success/errors. Invalid JSON/schema, blank messages and invalid language tags return generic 400s; provider failures, malformed/extra/missing output fields and blank reply fields return generic 502s without provider details.
- Mock limits: one fixed clinician reply works in en/es/ar/zh-Hans; unsupported text/languages explicitly return unavailable placeholders. The mock does not evaluate the prompt or implement live translation, reading-level adaptation or mode-specific phrasing. Redaction still misses names/addresses and some date formats; synthetic data only. No SDK, API key, new dependency, contract, provider, fixture, frontend, mock or input-channel changes.
- Checked: typecheck and all 45 tests pass (12 new route/pipeline tests); lint has 0 errors and the same 188 existing bundled-skill warnings. Tests cover multilingual fixtures offline, all modes/reading levels reaching the model, request defaults, pre-send/output masking, preservation of clinical numbers, invalid input/output, generic failures/no logging, and request isolation.
- Next: implement anonymous `/api/metrics` against its existing contract, with no content/identifiers. Coordinate frontend API wiring separately with Zach; clinician auth, bank scale reconciliation (0–10 vs frontend mock 1–5), translations/assets and live-model evaluation remain pending. PR #27 is merged and its task row now reflects that.
- Touched: `src/app/api/respond/{route.ts,route.test.ts}`, `src/lib/server/respond/{index.ts,prompts.ts,respond.test.ts}`, `src/lib/server/test-support/run.mjs`; shared `docs/TASKS.md` and `docs/HANDOFF.md`. Existing handoff entries preserved. Local `.graphifyignore`, `.impeccable/review/`, and ignored graphify artifacts stay excluded.

### 2026-11-07  Prem / Codex  prem/translate-api (PR #27 handoff conflict resolution)
- Done: merged current main into the published task branch and preserved both the heartbeat-animation and translate-API handoff entries verbatim. No branch history rewritten; upstream frontend changes arrive unchanged.
- Checked: typecheck, all 33 tests and `git diff --check` pass; lint has 0 errors and the same 188 existing bundled-skill warnings. No unresolved conflicts; upstream frontend files match main exactly.
- Touched: conflict resolution in shared `docs/HANDOFF.md`; task row links PR #27. No runtime implementation changes.
- Next: review/merge PR #27, then implement `/api/respond` against the existing mock provider.

### 2026-11-07  Zach / Claude  zach/heartbeat-progress (the rod becomes the page's pulse, one fluid motion)
- Done: the rotating 3D Rod of Asclepius (`asclepius-3d.tsx`, removed) is replaced by `src/components/home/heartbeat-journey.tsx`. One continuous line, scroll-scrubbed through a spring, flows through Akash's key frames (`Akash NAT HACKS 2026 File/Frames`):
  - Frame 0: the rod in the hero.
  - Frame 6: a heart-rate monitor across the middle of the screen.
  - The progress line on the header's bottom border.
- What becomes what:
  - The snake becomes the bright trace.
  - The staff tips over into the faint track.
  - The snake's head becomes the pen that marks scroll progress, with a small resting heartbeat.
- It reverses exactly when you scroll back up. Below `xl` the progress line fades in; reduced motion swaps states without movement.
- How:
  - Two fixed canvases render the same frame: one at `z-[5]` (under the pinned phone), and one at `z-[60]` clipped to the header strip.
  - Keyframes are recomputed every frame from the hero's `data-emblem-slot`, and staged eases blend them with no overshoot.
  - Zach rejected the first version (separate timed morph, shoot and dock steps) as "not a fluid animation".
- Checked: 1440x900 scroll sweep (rod, uncoil, monitor frame behind the phone, glide up, docked tracker) and 390x844 (no overflow). Typecheck and lint are clean.

### 2026-11-07  Prem / Codex  prem/translate-api
- Done: implemented stateless `POST /api/translate` and the translate pipeline using existing Zod contracts and `callModel`. Four synthetic stories retain their canned translations; unsupported/guided requests stay explicitly mock-unavailable. No SDK, key, model adapter, schema, or dependency declaration changes.
- Guided inputs: option/pictogram selections require a known `questionId`; resolve only within that question to a pre-written English label. Unknown answers and ambiguous pictograms (e.g. `arm` cannot distinguish left/right) return 400; send a distinct option ID instead. Empty answers/requests and invalid language tags return 400 too. Bank severity remains 0–10.
- Privacy: masks input before the model and every returned text field after output validation. Pipeline owns `original` and the redaction count; counts input/output masking occurrences, not unique identifiers. All responses have `Cache-Control: no-store`; invalid JSON/schema/selection errors use generic 400s, model/output failures generic 502s. No content logging, persistence, or request state retained between calls. Existing redaction still misses names/addresses and some date formats; synthetic data only.
- Checked: typecheck and all 33 tests pass; lint has 0 errors and the same 188 existing warnings in unchanged bundled skill scripts; `git diff --check` passes. Added 11 route/pipeline tests covering fixtures, mixed guided/text/speech input, ambiguous selections, pre-send/output masking, malformed model output, provider errors, and request isolation. Restored locked dependencies with `npm ci --ignore-scripts` after typecheck exposed locally missing, already-declared `three` packages; manifests/lockfile unchanged.
- Next: implement `/api/respond` and its model-neutral prompt using the existing mock provider. Frontend API wiring, metrics, clinician-auth backend, translations/assets and clinical/fluent-speaker review remain separate. Reconcile the bank's 0–10 severity scale with frontend mock's 1–5 scale before wiring.
- Touched: `src/app/api/translate/{route.ts,route.test.ts}`, `src/lib/server/translate/{index.ts,prompts.ts,translate.test.ts}`, the existing `src/lib/server/test-support/run.mjs` test list, shared `docs/TASKS.md` and `docs/HANDOFF.md`. Foundation files, contracts, question bank, frontend, mocks, and input channels unchanged. Local `.graphifyignore`, `.impeccable/review/`, and ignored graphify artifacts excluded.

### 2026-11-07  Zach / Codex  zach/shared-design-system
- Done: consolidated native Button variants and loading primitives in src/components/ui; session wrappers and auth controls delegate to them. Exposed existing radius/fluid-type values as Tailwind tokens; shared field-control utility keeps input/textarea treatments consistent. Fixed dangling hint descriptions when a field error replaces its hint; disabled buttons no longer press/hover.
- Documented: additive reuse guidance in DESIGN.md and five sidecar snippets. Existing palette, typography, layouts, specialised marketing/handoff actions and mock boundaries preserved. Finish reviewer disposition: ship for this bounded extraction.
- Checked: typecheck, 22 tests, lint (0 errors; 188 existing bundled-skill warnings). Browser checked 390x844 and 1440x900, field focus/errors, mock Google signin, patient text intake and signout; no horizontal overflow in checked views. Captures remain local in .impeccable/review/.
- Graphify: queried existing graph and saved useful findings; graphify-out remains ignored and no graphs are tracked.
- Collaboration: another session changed the original checkout to zach/heartbeat-progress during work. Isolated this commit in /private/tmp/synapse-design-system; excluded all concurrent home-page, heartbeat and documentation edits. Original checkout still contains the design-system working copies for the live preview; coordinate before that session commits overlapping files.
- Touched: shared globals.css, DESIGN.md, .impeccable/design.json, docs/TASKS.md and docs/HANDOFF.md; frontend ui/, session/{ui,patient-screens,clinician-screens}, auth/{auth-ui,profile,require-clinician}.
- Next: review/merge this frontend refactor, then audit account/session screens for remaining accessibility and mobile edge cases. Auth seed-waiver and broader UI review remain separate.

### 2026-11-07  Zach / Codex  zach/setup-verification
- Done: pulled main (already current), reviewed project instructions, product/API/team docs, task board, handoff, recent history and core backend/mock boundaries. No open PRs at check time.
- Tooling: all 13 shared project skills have Codex and Claude copies; all 10 skills-lock entries are present. Dependencies, local .env and generated Prisma client already exist; no secrets read or changed. Impeccable engine 0.1.18 and local UI/UX search work. No installs or database changes needed.
- Checked: typecheck and all 22 tests pass; lint has 0 errors and 188 existing bundled-skill warnings.
- Next: claim Backend 1 translate/respond pipelines and routes against existing contracts and the mock provider; frontend wiring and clinician auth remain separate tasks.
- Touched: docs/TASKS.md and docs/HANDOFF.md only. Existing untracked .impeccable/review/ captures preserved.

### 2026-11-07  Zach / Claude  zach/handoff-sync (state of main after the home page work)
- State: everything from today's home page work is merged to main. That covers PR #20 and #21 (Akash's 3D iPhone model, one pinned phone over a blended page) and PR #22 (the finish review fixes, verdict **ship**). The task board rows for PR #14 (3D emblems) and #16 (clinician accounts) now say merged as well.
- Home page as it stands:
  - On desktop, ONE CSS-sticky phone runs from the hero to the end of privacy. Its screen follows the section or step at the middle of the viewport.
  - The colour bands melt into each other, so the phone never sits across a hard edge (`.page-melt-down`, `.page-melt-up` and `.page-mist` in globals.css).
  - On mobile there's a hero phone, plus one steps phone driven by a swipeable card track.
  - Zach rejected three alternatives; do not bring them back: a phone that flies between sections, one phone per section, and a pinned phone over hard colour edges.
- Decided (Zach): the 3.8 MB phone model stays uncompressed. The Rod of Asclepius stays; Akash pushed the snake animation frames to `Akash NAT HACKS 2026 File/Frames/`.
- Open on the frontend:
  - The impeccable seed waiver for the auth pages (see the clinician accounts entry below).
  - Whether to keep the Rod of Asclepius above the desktop fold (the reviewer left that to the team).
  - Wiring the session UI to the real `/api/translate` and `/api/respond` once Backend 1 lands them.
- Tooling note: Zach uses graphify, a local code knowledge graph in `graphify-out/`. It is in `.gitignore`, so never commit it. Anyone can build their own with the graphify skill.
- Dev gotcha: running `next build` while `next dev` is up can leave the dev server serving stale CSS. The fix is to stop it, `rm -rf .next`, and run `npm run dev`.

### 2026-11-07  Zach / Claude  zach/home-finish-fixes (impeccable finish review of `/`: ship)
- Done: ran the impeccable finish review on the home page (code-led, pinned brief). Round 1 was **fix** with 8 material fixes. Two fix batches and verdict passes later the verdict is **ship**, scoped to those fixes. Merged as PR #22, on top of PR #21 (3D phone and blends).
- Changes:
  - Mobile steps use ONE phone driven by a swipeable scroll-snap track of step cards, replacing six phones. Mobile now has 2 phones and the page went from about 10.9k to 6.2k px.
  - The mobile hero phone is sized so the patient sentence, read-back, clinician summary and Pause control all land in the first 390x844 viewport. "See a visit" moved under the phone.
  - The "<holder> holds the device" chip above step headings is removed (a kicker ban); the phone's ScreenBar carries the holder.
  - Privacy has its own pinned-phone screen (`PrivacyScreen` in step-screens.tsx) instead of reusing step 6.
  - The hero and modes screens end in a one-line composer bar, so the glass has no dead white bottom.
  - The closing band shows the 3D S without the duplicate wordmark.
  - The phone's floor shadow is softer.
  - The brief's FORM line quotes Zach's words as the authority for the pinned structure.
- Kept on purpose: the Rod of Asclepius (Zach approved it; Akash is making its snake animation frames) and the "DC" account avatar (the clinician sign-in feature).
- Checked: the reviewer scored every fix resolved on the recaptures. Typecheck, lint (0 errors) and the 22 tests pass. Captures are in `.impeccable/review/` (local, not committed).
- Decided (Zach): leave the 3.8 MB phone model as it is; do not compress it.
- Next: if the team wants it, cap the Rod of Asclepius above the desktop fold (the reviewer left that call to the team).

### 2026-11-07  Zach / Claude  zach/3d-phone (3D pinned phone on the home page)
- Done: the home page phone is now Akash's real iPhone model (`public/models/iphone.glb`, three.js; the Apple logo on the back is hidden). From `lg`, ONE phone is pinned on the right (CSS sticky) from the hero to the end of privacy while content scrolls on the left; its screen follows the section/step at the middle of the viewport, with a small spring swing on each change. The page melts between colour bands (navy hero -> white, a soft Mist band for modes, white -> navy into the closing band; `.page-melt-down` / `.page-melt-up` in globals.css), so the pinned phone never sits across a hard colour edge. Zach rejected: a phone flying between sections (lagged/jumped, crossed the screen) and one phone per section (too many phones). Keep ONE pinned phone over a blended page. Below `lg` each section keeps its own in-flow phone sized to fit (~284x590 at 390x844).
- How: `src/components/home/phone-rig.ts` (renderer + the CSS transform that locks the HTML screen to the model's glass), `phone-3d.tsx` (the phone; `swing` prop), `phone-rail.tsx` (the pinned phone, rendered inside `<main className="relative">` in `src/app/page.tsx`; sections mark themselves with `data-phone-screen` and keep the right 26rem clear on `lg`), `rail-store.ts` (modes tab + language shared between the modes section and the phone). `HeroDemo` in `hero-exchange.tsx` owns the hero exchange for both the mobile phone and the rail.
- Checked: 1440x900 (phone holds the same screen position from hero to privacy) and 390x844 (no horizontal overflow). Typecheck and lint pass. Playwright emulates reduced motion by default; use `emulateMedia({ reducedMotion: "no-preference" })` to see the motion.
- Shared files: `package.json`/`package-lock.json` (added `three`, `@types/three`; the lockfile also picked up npm's own churn such as the name "scaffold" -> "nathacks26"). `DESIGN.md` Motion/phone frame/layout updated.
- Update: merged as PRs #20 and #21. The finish review ran afterwards (see the zach/home-finish-fixes entry, merged as PR #22). The model stays uncompressed (Zach's call).
- Touched: `src/components/home/{phone-3d,phone-rail,rail-store}.tsx|ts`, `phone-rig.ts` (new), `phone.tsx`, `hero.tsx`, `hero-exchange.tsx`, `workflow.tsx`, `modes.tsx`, `privacy.tsx`, `src/app/page.tsx`, `public/models/iphone.glb` (new), `DESIGN.md`, `docs/HANDOFF.md`, `docs/TASKS.md`; shared `package.json`, `package-lock.json`. `.impeccable/review/` stays local and uncommitted.

### 2026-11-07  Prem / Codex  prem/session-wrap-up
- Done: [PR #18](https://github.com/PremD27/NatHacks26/pull/18) is merged into main. Foundation and question-bank task rows now say merged. The earlier HANDOFF.md conflict was resolved with both branches' entries preserved; all previous entries below remain unchanged.
- State: `LLM_PROVIDER` defaults to `mock`; no model, key, or model SDK is needed. The foundation includes contracts, redaction, four synthetic multilingual stories, and all 17 history questions. API routes, real-provider integration, and frontend wiring remain unfinished; the UI still uses its existing mocks.
- Checked: typecheck and all 22 tests pass; lint has 0 errors and 188 existing warnings in unchanged skill scripts.
- Next: sync main, start a new Backend 1 task branch, and build the translate/respond pipelines and API routes against the shared contracts and mock provider. Follow `docs/API.md` and the local route-handler docs; claim the relevant task rows before editing. This is the next-session starting point, not work implemented by this wrap-up.
- Outstanding: redaction is best effort, not complete identifier detection; question translations/pictogram assets and clinical/fluent-speaker review remain pending. Reconcile the bank's source 0–10 severity scale with the frontend mock's 1–5 scale when integrating. Auth backend remains a separate unimplemented task.
- Touched: `docs/TASKS.md` and `docs/HANDOFF.md` only. `.env` stays ignored; pre-existing `.impeccable/review/` remains local evidence and must not be committed.

### 2026-11-07  Prem / Codex  prem/backend-foundation (PR #18 conflict resolution)
- Done: merged current main into the published foundation branch and resolved the HANDOFF.md conflict by preserving both the foundation entry and Zach's 3D-logo fix entry. No branch history was rewritten and no runtime code was edited for this resolution; the upstream logo fix is included unchanged.
- Checked: typecheck and all 22 tests pass; lint has 0 errors and the same 188 pre-existing skill-script warnings. All prior handoff entries from both branches are preserved verbatim.
- Next: review/merge PR #18. Foundation scope remains unchanged; no API routes or model SDK added.
- Touched: shared docs/HANDOFF.md and docs/TASKS.md; upstream src/components/brand/synapse-mark-3d.tsx arrives unchanged from main.

### 2026-11-07  Prem / Codex  prem/backend-foundation
- Done: foundation only. Added Zod schemas/types matching every draft frontend type (compile-time compatibility test), including optional `questionId`, default reading level 3, metrics/errors, and question types. Existing `contracts/input.ts` is unchanged. Strict objects reject undeclared fields.
- Done: `callModel({ system, user }): Promise<string>` defaults to `LLM_PROVIDER=mock`, appends identifier-omission instructions, and rejects unimplemented providers with a generic error. The deterministic mock uses a JSON `{ task: "translate" | "respond", request }` envelope documented in `providers/README.md`; four synthetic stories (en/es/ar/zh-Hans) and one canned reply work offline. Unknown/guided inputs get explicit unavailable placeholders. `LLM_MODEL` is reserved/ignored by mock. No provider SDK, API key, network request, API route, frontend wiring, logging, or patient persistence was added.
- Done: best-effort `redact(text)` returns only masked text and a count. Tests cover phone formats, neighboring/repeated numbers, emails, numeric/English month-name dates, and preservation of clinical numbers. It is not a complete identifier detector (names/addresses and other date formats need further work before a real provider).
- Done: English question skeleton imports all 17 `history_questions` read-only, adds stable IDs/options/pictogram names, and maps every `RegionId` to the Location (`where`) answer and shared follow-ups. Severity retains the source's 0–10 scale; the existing frontend mock uses 1–5, so reconcile that when integrating. Translations/pictogram assets and clinical review remain follow-up work.
- Checked: `npm run typecheck` passes; `npm run lint` passes with 188 pre-existing warnings in unchanged skill scripts; `npm test` passes all 22 tests. Tests use the existing TypeScript compiler and Node runner, compile only tests/imports into a disposable temp folder, and add no test dependency. Zod is the only added dependency; lockfile changes are limited to that promotion from a transitive dependency.
- Next: review/merge this shared foundation PR, then implement the translate/respond pipelines and API routes against these schemas. Frontend still uses its existing mocks. No real adapter or key is needed for this PR; the user's mock-only instruction supersedes the earlier Anthropic foundation plan below.
- Touched: `src/lib/contracts/{index.ts,contracts.test.ts}`, `src/lib/server/{llm.ts,llm.test.ts,redact.ts,redact.test.ts,fixtures/stories.ts,providers/mock.ts,providers/README.md,test-support/run.mjs}`, `src/lib/questions/{index.ts,questions.test.ts}`; authorized shared files `.env.example`, `package.json`, `package-lock.json`, `docs/TASKS.md`, `docs/HANDOFF.md`. `.env`, frontend/input files, mocks, `medical_terms.json`, and API routes are unchanged. Pre-existing `.impeccable/review/` is local evidence and must not be committed.

### 2026-11-07  Zach / Claude  zach/fix-3d-mark
- Fixed: the closing band's 3D "S" showed as the logo repeated down the page. Cause: the dev server served stale CSS (Tailwind cache after a branch switch), and without the `.mark3d-*` styles the 17 extrusion layers stacked vertically. The layout-critical styles (perspective, preserve-3d, absolute layers) are now inline in `src/components/brand/synapse-mark-3d.tsx`, so it degrades to a single solid logo even with stale or missing CSS; `globals.css` only adds the angle and scroll turn. Verified with the stale stylesheet still being served.
- Reminder for everyone: after pulling or switching branches, if styles look wrong, stop the dev server, `rm -rf .next`, `npm run dev`.
- Touched: `src/components/brand/synapse-mark-3d.tsx`, `docs/HANDOFF.md`. Not committed yet.
### 2026-11-07  Zach / Claude  zach/clinician-auth (clinician accounts, frontend on a mock)
- **Scope change (decided by Zach):** Synapse is a paid app, so clinicians have their own account (their own profile only). Patients still have no account and nothing about them is stored. Updated `docs/PRODUCT.md` (new "Clinician accounts" section), `PRODUCT.md`, `AGENTS.md` privacy line (shared file: "no patient profiles"), and landing copy ("no patient accounts").
- Done (frontend): `/signin` (Continue with Google + email/password, show/hide password, forgot link), `/signup` (name, email, password, role, clinic; inline validation), `/forgot-password` (no account enumeration), `/profile` (name, role, clinic, languages spoken, read-only plan card, sign out, welcome note after sign-up). **Sign-in is required before `/start`** (client gate `RequireClinician`); the landing page stays public. Account control in the landing header and the session bar (initials -> profile; hidden mid-visit so a visit is never abandoned by accident).
- **Backend 1:** real routes are drafted in `docs/API.md` ("Clinician accounts": signup, signin, Google OAuth, forgot-password, signout, GET/PATCH /api/me; httpOnly cookie sessions; hashed passwords; one `Clinician` table, no patient tables). Swap `src/components/auth/api.ts` from the mock to your routes and add the server-side gate for `/start`. Contract changes are flagged in the PR.
- Mock: `src/lib/mocks/auth.ts` keeps only the signed-in clinician's profile in localStorage; never passwords, never patient data. Any 8+ character password works; "Continue with Google" signs in a demo Google account. Labelled on the sign-in pages.
- Verified in a browser at 390 and 1440: gate redirect, Google -> /start, profile save, sign out re-gates /start, sign-up validation and welcome, reset confirmation, no password in storage, no horizontal overflow. Typecheck, lint clean; design detector 0 findings. impeccable brief: `.impeccable/surfaces/src-app-signin-page-tsx.md`.
- Finish review (impeccable): all code fixes resolved (plan card has no eyebrow and says "Sample plan · billing not connected" while on the mock, demo notice on /profile, desktop brand panel pinned so its disclaimer never clips, password toggle has one accessible signal, email and provider on two lines). **Open:** the impeccable brief's FORM line has no seed; the reviewer needs Zach's explicit waiver (e.g. "Skip the concept roll for the sign-in, sign-up, forgot-password and profile pages") quoted in `.impeccable/surfaces/src-app-signin-page-tsx.md`, then it can ship. Optional: fold the /profile demo notice into the privacy note (two Cool Mist boxes stack).
- Next: PR open. Backend 1 builds the real routes from `docs/API.md` and swaps `src/components/auth/api.ts`. Run the impeccable documenter to add the auth pieces to `DESIGN.md`.
- Touched (committed on `zach/clinician-auth`): `src/components/auth/*` (new), `src/lib/mocks/auth.ts` (new), `src/app/{signin,signup,forgot-password,profile}/page.tsx` (new), `src/app/start/page.tsx`, `src/components/home/site-header.tsx`, `src/components/home/privacy.tsx`, `src/components/home/data.ts`, `src/components/session/session-app.tsx`, `src/lib/mocks/AGENTS.md`, `AGENTS.md` (shared), `PRODUCT.md`, `docs/PRODUCT.md`, `docs/API.md` (contract draft), `docs/HANDOFF.md`, `docs/TASKS.md`.

### 2026-11-07  Zach / Claude  zach/3d-emblems (3D emblems on the home page)
- Done: two 3D pieces on the landing page, no new libraries (package.json untouched).
  - **Rod of Asclepius** (`src/components/home/asclepius-3d.tsx`): the medical emblem (one snake, one staff, no wings; Zach first got a caduceus from Gemini, which is the commerce symbol, not medicine). Canvas with real 3D maths: the snake is a tube wound round the staff, depth-sorted so it passes behind and in front of it, lit per segment, glossy highlight drawn in a second pass. Turns once every ~22 s, pauses off-screen, still frame under reduced motion. In the hero it stands in the gap between the headline and the phone from 1280px up (hidden below that: it would overlap the text). It replaces the old heartbeat line from the previous logo.
  - **Extruded Synapse "S"** (`src/components/brand/synapse-mark-3d.tsx` + `.mark3d-*` in `globals.css`): the mark as a solid object (16 stacked layers form the side walls, shaded from DESIGN.md tokens). It turns from edge-on to facing the visitor as the closing band scrolls in (CSS scroll-driven animation); browsers without scroll timelines and reduced-motion users see it at rest, slightly angled. Replaces the flat lockup in the closing band; the wordmark sits under it. Visible on every screen size.
- `WHITE_MARK` / `BLUE_MARK` are now exported from `src/components/brand/synapse-logo.tsx` so the 3D mark reuses the real logo paths.
- Checked at 390, 1024, 1280, 1440 (placement measured; no horizontal overflow; reduced motion: rod static, mark not animated). Typecheck, lint clean; design detector 0 findings.
- Next: PR open for review. Optional: a phone-sized home for the rod (it is desktop-only now); add the 3D pieces to `DESIGN.md` via the impeccable documenter.
- Touched: `src/components/home/asclepius-3d.tsx` (new), `src/components/brand/synapse-mark-3d.tsx` (new), `src/components/home/hero.tsx`, `src/components/home/closing.tsx`, `src/components/brand/synapse-logo.tsx` (exports only), shared `src/app/globals.css` (3D mark styles), `docs/HANDOFF.md`, `docs/TASKS.md`.
- Notes: `globals.css` edits still need a dev-server restart (`rm -rf .next && npm run dev`).

### 2026-11-07  Prem / Claude  prem/llm-wrapper
- Done: decided the model will change later (Claude for now, exact next model unknown). Docs now call for a provider-neutral wrapper: `src/lib/server/llm.ts` exporting `callModel({ system, user })`, with the Anthropic adapter in `src/lib/server/providers/anthropic.ts`, chosen by `LLM_PROVIDER` / `LLM_MODEL` env vars. This replaces every earlier mention of `claude.ts` / `callClaude` in older entries below; treat those as `llm.ts` / `callModel`.
- Next: Backend 1 (Prem, with Codex) builds the foundation PR using that name: zod contracts incl. optional `questionId`, `llm.ts` + Anthropic adapter, `redact()` + tests, fixtures, question-bank skeleton from the 17 `history_questions`, and `@anthropic-ai/sdk` + `zod`. Document `ANTHROPIC_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL` in `.env.example`.
- Blocked / needs: API key from console.anthropic.com (billing/credits needed; ask organizers about credits).
- Touched: `AGENTS.md` (shared), `docs/PRODUCT.md`, `docs/TEAM.md`, `docs/TASKS.md`, `docs/HANDOFF.md`, `src/lib/server/AGENTS.md`.
- Notes: when the model is switched, rerun the fixture stories in several languages and check the new provider's data retention terms.

### 2026-11-07  Zach / Claude  zach/start-flow (session flow at /start), PR #12 open
- Done: built the session flow at `/start`: Start (language, mode, path) -> intake (free-form speech/typing/tap-phrases, or guided questions with pictures) -> patient confirms read-back -> handoff -> clinician review (summary, red flags, original, back-translation, low-confidence, redaction count) -> reply (suggested replies or free text) -> handoff -> patient response + teach-back -> hand back -> review shows each reply and whether it was understood -> End clears. Two-step Clear always in the session bar; idle timeout 3 min + 30 s warning ("Keep session"), then wipe. Patient UI in en/es/ar(RTL)/zh-Hans; clinician UI in English. Mode rules: Deaf/HoH typing-first, no audio-only cues; low literacy guided + read-aloud; can't speak builds phrases and speaks them.
- **MOCKS (all agents read this):** `src/lib/mocks/` stands in for `POST /api/translate`, `POST /api/respond`, `POST /api/metrics`, shaped exactly like `docs/API.md`. Read `src/lib/mocks/AGENTS.md`. The UI calls them only through `src/components/session/api.ts`; **Backend 1: when your routes work, change that one file to `fetch()` them, keep the shapes, and tell Frontend.** Draft types in `src/lib/mocks/types.ts` get replaced by the zod contracts in `src/lib/contracts/` when those land. Put `#fail` in any input to test the failure path. Mock question bank, tap-phrases, and clinician replies live in `src/lib/mocks/data.ts`; Backend 1 owns the real question bank in `src/lib/questions/` (copy from the mock if useful).
- Backend 2: guided intake leaves a slot for the body diagram (comment in `IntakeGuided`, `src/components/session/patient-screens.tsx`); it should emit a `RegionId` that maps to the `where` question.
- Process: impeccable direction contract at `.impeccable/surfaces/src-app-start-page-tsx.md` (Operate mode, pinned), ui-ux-pro-max (progress indicators, visible labels, back behaviour; timeout guidance fell back to WCAG 2.2.1), apple-design (press springs, blur-rise screen entrances, reduced-motion fallbacks). Driven end to end in a browser at 390, 820, 1440 (Spanish free-form, Arabic guided RTL, Mandarin, #fail fallback, mute phrases, idle expiry via clock fast-forward). Detector 0 findings; typecheck and lint clean.
- Finish review (impeccable, fresh reviewer): final disposition **ship**. First verdict was fix with 8 items, all resolved after one fix round plus regression fixes. Biggest one, a privacy bug: with `cacheComponents: true` in `next.config.ts`, Next keeps routes hidden (React Activity) instead of unmounting them, so leaving `/start` mid-visit and pressing Back restored the whole session and the idle wipe never ran. Fixed in `session-app.tsx`: the session wipes in an effect cleanup (runs on hide) and on `pagehide` / bfcache `pageshow`. Verified in a browser (patient text gone from the DOM after leaving and after Back). **Anyone adding state to the flow must keep it inside that reducer so the wipe covers it.** Other fixes: idle warning in the patient's language, guided read-back as question/answer pairs (`QUESTION_SHORT`, `OUT_OF_FIVE` in `src/lib/mocks/data.ts`), labelled red-flag block, meta line under the review title, single confirmed card when back-translation equals the original, Start order language -> mode -> path at every size, RTL action bar and full-width RTL read-back, larger picture tiles on tablets, redrawn pictograms, cross icon for teach-back "No", pass motion on handoff screens.
- After the documenter pass: fixed the three drifts it flagged (drawn `Question` icon replaces the typed "?" on teach-back, clinician bubble and summary sheet tail moved to bottom-right per the Shapes rule, spinner stops under reduced motion); `DESIGN.md` and `design.json` notes updated to match.
- Seed: Zach waived the impeccable concept-seed roll for `/start` ("waive it", recorded in `.impeccable/surfaces/src-app-start-page-tsx.md`); the stages are pinned by `docs/PRODUCT.md`.
- State: **PR #12 is open** (https://github.com/PremD27/NatHacks26/pull/12), 4 commits: (1) new "S" logo, (2) `/start` session flow on mocks, (3) `DESIGN.md` + `design.json` session-flow pieces from the impeccable documenter, additive, plus the new logo wording, (4) three drift fixes. Not merged yet; a teammate should review it. The logo work from `zach/new-logo` was committed here, so `zach/new-logo` is not needed.
- Next (frontend), in order: (1) get PR #12 reviewed and merged; (2) try `/start` on a real phone, especially the microphone (Web Speech) and read-aloud; (3) fluent review of `src/components/session/strings.ts` and `src/lib/mocks/data.ts` (es, ar, zh-Hans); (4) when Backend 1's routes work, swap `src/components/session/api.ts` from mocks to `fetch()`; (5) drop Backend 2's body diagram into the slot in `IntakeGuided`; (6) small leftover: the home page hero still has a heartbeat line from the old logo (Zach to decide keep or remove).
- Touched: `src/app/start/page.tsx`, `src/components/session/*` (new), `src/lib/mocks/*` (new), icons appended to `src/components/home/icons.tsx`, shared `src/app/layout.tsx` (viewportFit cover only), `docs/HANDOFF.md`, `docs/TASKS.md`.
- Notes: speech recognition depends on the browser (Chrome/Edge/Safari); without it the intake falls back to typing automatically. Nothing is written to localStorage; refresh or back = session gone, by design.

### 2026-11-07  Zach / Claude  zach/new-logo
- Done: switched the site to Akash's new "S" logo (flowing S of two interlocking swooshes; SYN white / APSE light blue). Rebuilt `src/components/brand/synapse-logo.tsx` from `Akash NAT HACKS 2026 File/Gemini_Generated_Image_hiv1dghiv1dghiv1.svg` (1294x832 trace): removed the background box, coloured each swoosh to match the original image, cut the A and P counters. Same exports (`SynapseMark`, `SynapseWordmark`, `SynapseLockup`), so the header, closing band, and `/start` updated with no other code changes. Logo description updated in `DESIGN.md` (Overview, Brand > Mark, asset note), `PRODUCT.md`, and `.impeccable/design.json`.
- State of main: PR #10 (home page) is merged.
- Next: the session flow at `/start` (Phase 2 in `docs/TASKS.md`; frontend rows are unclaimed). Suggested build order:
  1. Mocks in `src/lib/mocks/`: fake `POST /api/translate` and `POST /api/respond` results shaped exactly like `docs/API.md`, plus 3-4 sample guided questions. Reuse the synthetic phrases in `src/components/home/data.ts`. The zod contracts in `src/lib/contracts/` are not written yet (Backend 1's first shared PR), so mirror `docs/API.md` and swap to the real types when they land.
  2. Stage-flow shell: one client page that moves through start -> intake -> handoff -> review -> response -> end. Session state in React memory only (no localStorage, nothing stored). Always-visible Clear button and an idle timeout that wipes the session. Back button must never reveal the previous person's content.
  3. Screens, in order: Start (language, mode, path), Patient intake free-form (Web Speech API with typed fallback), Handoff, Clinician review (summary, original words, back-translation, low-confidence phrases), Response + teach-back, End. Guided questions and the four mode variations after that.
  4. Visual reference: the six step screens in `src/components/home/step-screens.tsx` already show each screen; reuse `Phone`/`Bubble`/`ScreenBar` styling ideas from `src/components/home/phone.tsx`, but the real app is full-screen, not inside a phone frame.
  5. Model failures (502) must show a typed-fallback state and never block the visit (`docs/API.md`, Errors). The body diagram is Backend 2's component (`src/components/input/`); leave a slot for it in guided intake.
- Blocked / needs: lane owners for Backend 1 / Backend 2 are still TBD, so there is no API yet (build against mocks). Akash's logo as a real SVG export would still beat the trace (the `-removebg-preview.svg` he uploaded is empty). Fluent check of demo translations still open.
- Touched: `src/components/brand/synapse-logo.tsx`, `DESIGN.md`, `PRODUCT.md`, `.impeccable/design.json`, `docs/HANDOFF.md`, `docs/TASKS.md`. Committed on `zach/start-flow` (PR #12); `package-lock.json` stays uncommitted by Zach's choice; `.impeccable/review/` screenshots are local evidence only, never commit them.
- Notes: the hero's thin heartbeat line (in `src/components/home/hero.tsx`) was drawn from the old logo; it still looks fine but no longer echoes the mark; Zach to decide whether to keep it. Running `npm run build` while `npm run dev` is up breaks the dev server's CSS: restart dev (`rm -rf .next && npm run dev`) after a build.

### 2026-11-07  Zach / Claude  zach/landing-page (home page built)
- Done: built the home page `/` as one long demo page in the `DESIGN.md` theme at meuze.ai-level structure. Sections: navy header (logo, How it works / Patient modes / Privacy, Start) -> hero with a self-playing synthetic exchange in Spanish/Arabic/Mandarin (Pause/Play, pauses off-screen, still under reduced motion) -> "How it works": six steps with a pinned phone on desktop that turns at each device handoff, and a per-step phone on mobile -> "Same symptom. Four ways to say it." accessible tabs (language, Deaf/HoH, low literacy, can't speak) with a constant clinician summary -> privacy and "What Synapse is not" -> closing Start band and footer. Start links to `/start` (placeholder).
- Logo: `src/components/brand/synapse-logo.tsx` (`SynapseMark`, `SynapseWordmark`, `SynapseLockup`), vectorised from Akash's SVG with SYN white / APSE light blue restored.
- Process: impeccable (direction contract in `.impeccable/surfaces/src-app-page-tsx.md`, craft floor, detector: 0 findings, fresh finish review: fix round, then ship; documenter recorded the additions in `DESIGN.md` and `.impeccable/design.json` additively, every changed line listed in its report), ui-ux-pro-max (demo controls, no scroll hijacking, reduced motion), apple-design (press springs, reduced-motion fallbacks). Checked in a browser at 390, 1280, and 1440; contrast pairs all >= 5.08:1.
- Next: build the session flow at `/start` (start, intake, handoff, review, response, end) reusing `src/components/home/phone.tsx` bubbles and the step screens as a visual reference; add mocks in `src/lib/mocks/`.
- Blocked / needs: a fluent reviewer for the demo translations in `src/components/home/data.ts` (Spanish, Arabic, Mandarin); Akash's original two-colour logo file would still be nicer than the trace.
- Touched: `src/app/page.tsx`, `src/app/start/page.tsx` (new), `src/components/home/*` (new), `src/components/brand/synapse-logo.tsx` (new), shared `src/app/layout.tsx` (fonts, metadata, theme colour) and `src/app/globals.css` (tokens, motion), `.impeccable/*`, `docs/*`.
- Known drift left in `DESIGN.md` (not repaired, by the no-delete rule): `rounded.bubble` 1.9rem vs 1.75rem built bubbles; the Clinician bubble spec says Lift but navy surfaces carry no shadow; `spacing.section` 64/96px vs 96/128px home-page sections.
- Notes: in this setup the dev server does not pick up edits to `globals.css` (stale CSS is served); stop it, `rm -rf .next`, and run `npm run dev` again. Body background is navy on purpose so the translucent header reads navy; every section paints its own ground. Privacy copy must not claim identifiers are masked until the backend redaction lands.

### 2026-11-07  Zach / Claude  zach/landing-page (not built yet; notes only)
- Decided (Zach): home page `/` is a landing page only. It shows the app's workflow and has a Start button; clicking Start goes to a separate page where the session process begins. Keep Synapse's colours and overall theme (`DESIGN.md`: navy / light blue / white, soft and rounded), but match the quality and structure of meuze.ai.
- Research on meuze.ai (fetched, not copied; use its structure and polish, never its content, images, or branding):
  - Order: nav (logo, section links, one CTA) -> full-width hero (dark halftone illustration of the customer's real setting, scroll-scrubbed; headline + one CTA) -> "How it works" as a pinned, scroll-driven frame (steps on the left, a panel that changes per step on the right) -> numbered workflow cards with small real UI fragments (not full screenshots) -> one dark proof band -> before/after illustration of the same place on two days -> devices -> onboarding steps -> closing CTA band -> footer.
  - Craft: thin 1px frames with connector lines, small radii, almost no shadows, generous whitespace, short confident copy tied to concrete situations, sequential reveals, easing `cubic-bezier(.16,1,.3,1)`. Fonts there: Lora (statements), Geist (body), JetBrains Mono (labels); we keep Figtree + Noto Sans per `DESIGN.md`.
- Proposed Synapse mapping: nav with logo, How it works / Modes / Privacy, Start -> hero on navy with a live synthetic exchange (patient sentence -> clinician summary) and Start -> pinned "How it works": six steps (start, intake, handoff, review, response, end) with a phone showing each step's screen -> live demo (language + mode switcher, synthetic, labelled) -> four patient modes with small UI fragments -> privacy and honest limits -> closing Start band -> footer. `/start` is the separate app entry.
- Constraints for the build: no unverified statistics (no setup-time or cost numbers); no eyebrow labels above headings, no same-size icon-card grids, no emoji-as-icons (impeccable craft floor); synthetic data labelled; mobile-first at 390px.
- Logo: Akash's `Akash NAT HACKS 2026 File/Screenshot-2026-11-06-214307.svg` is a box with the logo cut out. Removing its outer rectangle subpath turns it into real logo shapes (the A and P counters are separate paths and must be cut with evenodd); subpaths can then be coloured to restore SYN white / APSE light blue. Not done yet.
- Next: Zach to say when to build. Earlier `/impeccable shape` rounds were cancelled; their sketches are in `.impeccable/mocks/decision/`.
- Touched: `docs/HANDOFF.md`, `docs/TASKS.md`. Uncommitted from earlier on this branch: `PRODUCT.md` (new), `.impeccable/design.json`, `.impeccable/config.json` (detector ignores), `.impeccable/mocks/decision/*`.

### 2026-11-07  Zach / Claude  zach/impeccable-design-json
- Done: updated `.impeccable/design.json` (impeccable's design sidecar) to match `DESIGN.md`: navy / light blue / white palette with tonal ramps, navy-tinted shadows, component previews recoloured, header preview is now a navy bar with the SYN/APSE wordmark, narrative (north star "The Steady Signal", rules, dos and don'ts) copied from `DESIGN.md`. Structure, typography, motion and breakpoints unchanged.
- Next: put the tokens in `globals.css` and fonts in `layout.tsx`, then shared UI components and the stage-flow shell.
- Blocked / needs: original two-colour logo from Akash. Akash's `Akash NAT HACKS 2026 File/Screenshot-2026-11-06-214307.svg` is a one-colour trace of a screenshot (black box with the logo cut out), usable only as a mono logo.
- Touched: `.impeccable/design.json`, `docs/HANDOFF.md`.
- Notes: `.impeccable/surfaces/src-app-page-tsx.md` still describes the deleted landing page and calls navy an "anti-reference"; impeccable may read it, so update or retire it before running `/impeccable` on `src/app/page.tsx` (ask Zach before deleting).

### 2026-11-06  Prem / Claude  prem/handoff-update
- Done: PRs #3 (scope, protocol, guides) and #7 (two intake paths, Backend 1 / Backend 2 lanes, input types) are merged. `main` also has Zach's PR #8 (navy/light-blue theme in `DESIGN.md`) and Akash's PR #6 plus the "AKASH NAT HACKS 2026" commit. No open PRs.
- Next: (1) Prem to say who is Backend 1 and who is Backend 2, then claim rows in `docs/TASKS.md`. (2) Backend 1 writes the first shared PR: zod contracts with optional `questionId`, `src/lib/server/claude.ts`, `redact()` stub, question-bank skeleton in `src/lib/questions/`, fixtures. (3) Frontend (Zach) continues tokens, fonts, shared components, stage-flow shell, and mocks in `src/lib/mocks/`. (4) Backend 2 can start the tap body diagram in `src/components/input/body-diagram/` against `src/lib/contracts/input.ts`; gaze and sign come after the core flow.
- Blocked / needs: lane owners not assigned; original logo file (SVG or high-res PNG) from Akash for Zach; Akash's jargon database not yet reviewed (Claude has not read it), so whoever does the question bank or prompts should check whether it feeds them.
- Touched: `docs/TASKS.md`, `docs/HANDOFF.md` only.
- Notes: `.impeccable/design.json` still has the old warm palette; update before using `/impeccable`. Duplicate copies of Akash's files exist on `main` (Akash's call). The README still has a "TODO" project name line, and `.env.example` needs `ANTHROPIC_API_KEY` documented when Backend 1 adds the Claude client. Nothing in the app calls Claude yet; no backend code exists.

### 2026-11-06  Zach / Claude  zach/dev
- Done: rewrote `DESIGN.md` for Akash's theme and logo (source: `Color Theme and Logo.pdf`). Palette sampled from the logo: navy `#101e34`, light blue `#77a0c4`, white. Added action blues `#2d5f8b` / `#1f4a70` because light blue on white is 2.76:1 (fails contrast). New Brand section (logo usage rules). Kept typography, spacing, radii, shadows, motion and component specs.
- Removed from `DESIGN.md` (described the deleted landing page): "Signature: two-visit story", "Not Canonized", ledger/hero layout details, old warm colours. Header changed from floating glass pill to a navy bar. Recoverable from git history (commit `4e1a0b0`).
- Next: put the tokens in `globals.css` and fonts in `layout.tsx`, then build shared UI components and the stage-flow shell.
- Blocked / needs: original logo file (SVG or high-res PNG) from Akash; the PDF only holds a 611x395 raster.
- Touched: `DESIGN.md`, `docs/TASKS.md`, `docs/HANDOFF.md`. Not committed yet.
- Notes: `.impeccable/design.json` (impeccable's sidecar) still has the old warm palette; update it to match `DESIGN.md` before using `/impeccable`. Leave `package-lock.json` uncommitted (Zach's choice). `main` has duplicate copies of Akash's files (root and `Akash NAT HACKS 2026 File/`) plus an empty `Akash` file; Akash's call.

### 2026-11-06  Prem / Claude  prem/team-lanes-v2
- Done: updated scope and lanes. Intake is now free-form OR guided questions; body diagram and gaze (ICU) and a small sign proof of concept are stretch. Backend split into Backend 1 (API: translate, respond, redact, metrics, question bank) and Backend 2 (input channels: body diagram, gaze, sign).
- Next: first shared PR (zod contracts incl. optional `questionId`, `claude.ts`, `redact` stub, question-bank skeleton, fixtures, mocks). Backend 2 can start the body diagram with tap against `src/lib/contracts/input.ts`.
- Blocked / needs: owners for each lane (TBD in `docs/TASKS.md`).
- Touched: `AGENTS.md` (shared), `docs/*`, `src/lib/contracts/input.ts` (new), nested `AGENTS.md`/`CLAUDE.md` in `src/components/input` and `src/lib/input`.
- Notes: a lane is a set of folders, not a job title. Camera video never leaves the device.

### 2026-11-06  Zach / Claude  zach/fresh-start (merged as PR #4)
- Done: deleted the pre-event example landing page (`src/components/landing/`, its page, design tokens, fonts, and unused scaffold SVGs in `public/`). `/` is now a blank "Synapse" placeholder.
- Renamed the product AccessLink -> Synapse everywhere: UI title/heading, `AGENTS.md`, `docs/*`, `DESIGN.md`, `.impeccable/design.json` (name only, nothing else changed).
- Next: pick the new design direction, then build mocks (`src/lib/mocks/`) and the stage-flow shell.
- Blocked / needs: nothing.
- Touched: `src/app/page.tsx`, `src/app/layout.tsx` (shared), `src/app/globals.css` (shared, reset to Tailwind import only), `AGENTS.md` (shared, name only), `DESIGN.md` and `.impeccable/design.json` (name only).
- Notes: `DESIGN.md` and `.impeccable/design.json` still describe the deleted landing design (warm peach look); the impeccable skill reads them, so update them when the new direction is set. Do not delete them without asking Zach.
- Notes: no fonts or color tokens are defined now; the next frontend session sets them. The 188 lint warnings come from vendored skill files under `.claude/` and `.agents/`, not app code.

### 2026-11-06  Prem / Claude  prem/product-scope-v2
- Done: refocused scope (clinician-first bridge, no stored data); wrote `docs/PRODUCT.md`, `ML.md`, `TASKS.md`, `API.md`, `TEAM.md`; added privacy and lane rules to `AGENTS.md`.
- Next: write the shared pieces PR (zod contracts, `claude.ts`, `redact` stub, fixtures), then split into translate and respond pipelines.
- Blocked / needs: team to agree `docs/API.md`; decide who is Backend A and B.
- Touched: `AGENTS.md` (shared), `docs/*`.
- Notes: Prisma/DB scaffold is unused on purpose; nothing is stored.
