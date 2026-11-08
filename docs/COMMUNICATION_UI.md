# Communication UI

The `/start` conversation workspace and `/icu` board extend the existing Synapse design system. The user-supplied Akash system specification and ASCII wireframe determine the composition. The earlier concept-roll waiver still applies (Zach, 2026-11-07: “waive it”); no new visual world was introduced. `docs/PRODUCT.md` remains the product source of truth. Root `DESIGN.md` and `.impeccable/design.json` are preserved.

## Surface and file boundaries

`src/app/start/page.tsx` mounts `CommunicationWorkspace`; `src/app/icu/page.tsx` mounts `IcuBoard`. Both retain `RequireClinician`. Components and styles live in `src/components/communication/`. This overhaul changes the frontend presentation and uses the existing session API adapter, speech hooks, strings, body diagram, and input contracts. Mocks, backend, contracts, and shared configuration are unchanged.

The matching surface briefs are `.impeccable/surfaces/src-app-start-page-tsx.md` and `.impeccable/surfaces/src-app-icu-page-tsx.md`.

## Conversation workspace

The conversation log and composer share a wide-screen split (1.4:1) and stack at 1000px and below. The log preserves patient and clinician turns in opposing tailed bubbles with original and translated text. Flip view rotates the log for a person facing the other side of the device. The header names the current holder and keeps Clear available. The sticky footer exposes interpreter guidance and the next handoff/review action.

The accessibility rail stays in the header. On smaller screens it collapses into a persistent mode/text-size row with a Change control; its expanded contents scroll within a bounded area. It provides Standard, Deaf/HoH, Pictures/AAC, and Can’t speak modes, text scales of 100%, 125%, and 150%, a scoped high-contrast toggle, and read-aloud settings where appropriate.

Implemented message inputs are:

- Browser speech recognition where supported, with a visible transcript, stop control, and typed fallback. Space toggles the microphone only outside editable or interactive controls when voice input is active.
- Typed text for either speaker; patient phrase chips and clinician suggested replies.
- Patient pictograms, duration/other existing guided choices, optional body-region selection through the existing body diagram, and a 0–10 pain choice.

The pain choice is appended as a localized free-text string such as `Pain intensity: 4/10` to the unchanged mock request. It is not a new contract field or structured severity result. The UI must not claim that the mock reliably extracts or interprets that value.

Patient messages first produce a pending read-back. The patient confirms the meaning before that turn enters the conversation, or returns to edit the draft. Context controls are disabled during work or a pending confirmation. Clinician replies use the existing mock response path. Teach-back records yes, no, or unsure against the latest clinician reply and returns to the conversation.

Pass to clinician replaces the workspace with a navy handoff screen. The clinical summary remains unrendered until “I’m the clinician” opens review. The speaker controls and this handoff button assert who holds the device; they are not authentication or an identity check. The route’s clinician-account gate is separate.

Review shows a patient recap beside a navy clinician summary. The summary presents the latest reported chief complaint and duration, symptoms and flags across confirmed turns, original text, translated text, and low-confidence reasons. Missing values remain “Not stated.” Copy communication summary uses the browser clipboard only when requested and asks the clinician to review it before adding it to a record. No vitals, assessment, diagnoses, medications, or orders are generated; clinical decisions remain with the clinician.

## Demo limits and fallback behavior

Only the four existing mock languages are exposed: English (`en`), Spanish (`es`), Arabic (`ar`), and Simplified Chinese (`zh-Hans`). The mock data and translation/reply behavior are unchanged. Keyword summaries and supplied reply translations demonstrate the interaction; they are not a full translation service. Replies outside the mock’s supported examples remain in English with an unavailable-translation notice. A fluent speaker’s review and a qualified interpreter remain necessary where appropriate.

The interpreter action opens guidance to contact the clinic’s service or staff; Synapse does not place a call or notify anyone. Deaf/HoH mode enlarges conversation captions and hides read-aloud controls. Its door-knock notice is an explicitly manual demo cue, not ambient sound detection. Pictures/AAC is the existing limited pictogram/phrase vocabulary, not a complete AAC system. No developer inspector or device-preview interface is included in the patient flow.

Request failure preserves the draft and offers retry, typing, or interpreter help. Speech recognition and synthesis depend on browser support; text remains available. Patient-language blocks carry `lang` and `dir`; Arabic content uses right-to-left direction while English interface blocks retain their own direction.

## Memory and clearing

Conversation, pending read-back, draft, selections, and summaries are React/browser memory only; there is no patient persistence. Clear and End use a two-step confirmation. Clearing invalidates outstanding requests so a late response cannot repopulate the conversation, stops recognition, and cancels speech synthesis. End opens the Session cleared state.

The workspace also invalidates work and wipes conversation content when the route is hidden/unmounted, on `pagehide`, and on a persisted `pageshow` restoration. Its idle timer warns at 4 minutes 30 seconds, offers Keep session, and clears at 5 minutes without activity. These protections do not make the UI an authentication boundary. Clipboard text explicitly copied by the clinician is outside the app’s in-memory clearing behavior.

## ICU preview and integration boundary

`IcuBoard` displays six English choices: Yes, No, Pain, Help, Move me, and Take a break. Native buttons support touch/mouse and keyboard activation. Selection appears with a check, a Selected label, `aria-pressed`, and a polite status message. Clear preview choice removes the local selection. The board and clinician guidance stack on smaller screens.

This is a frontend preview only: no camera is accessed and no calibration, gaze detection, gaze processing, or automatic dwell selection runs. Hover or focus fills a decorative progress bar but never activates a target. Choices do not notify staff, request assistance, or trigger clinical actions. Selection remains in local React state and is cleared when the component is hidden/unmounted; no selections are stored.

The presentation boundary is `IcuBoard({ onSelect? })`, where `onSelect` accepts the existing `SelectEvent` contract. Manual button activation currently emits `{ channel: "tap", optionId }`, including native keyboard activation. The `/icu` route supplies no callback, so this event is not connected to backend behavior. The input-channel team can wire the callback and a real input source later; this preview must never fabricate a gaze event.

## Visual and motion implementation

The surfaces retain the incumbent navy, light blue, white, and cool-blue palette; Figtree headings; Noto Sans body/interface text; Arabic and Chinese font support; pill controls; soft panels; and speaker-side bubble tails. Default workspace text starts at 16px and can be increased by the accessibility scale. Panels use 28px corners, bubbles use 30px corners with an 8px tail, and actions remain at least 44px tall (primary actions 48px). These are local implementation details, not changes to the shared design tokens.

Black with yellow (`#ffea00`) is an explicit user-requested accessibility override scoped to these communication surfaces. It does not redefine the global navy/light-blue identity. Selection uses labels/checks or borders alongside color. Focus has a visible outline. Motion is supplementary: message arrivals, selected picture feedback, decorative voice bars, and an ECG-shaped busy indicator. The busy indicator is a loading symbol, not a vital reading. Reduced-motion media queries remove these animations and press transforms; text and states stay visible.

The shared `DESIGN.md` still describes the earlier staged session wizard, full-screen hand-back pattern, 18px body baseline, and some older session component anatomy. These communication surfaces intentionally replace that page composition with the supplied workspace layout. Treat this document and the surface briefs as the current page-specific record; a future coordinated system-document refresh can reconcile the older session descriptions without changing the global identity.

## Asset and reference provenance

- `public/communication/synapse-gemini.png`: user-supplied Gemini PNG copied from Akash’s supplied `...removebg-preview.png`; used on handoff and cleared screens. Provenance is embedded using Impeccable’s `embed-prompt` workflow; the implementation’s provenance scan reported one raster and zero missing entries. No new image generation was performed for this implementation.
- `src/components/communication/motion.tsx` and scoped CSS: adapted from the newly merged user-supplied `synapse-motion.zip`, including VoiceBars and EkgLoader. The extracted reference stays outside the repository at `/private/tmp/synapse-motion-reference`.
- Optional code graph: `/private/tmp/synapse-graphify/graphify-out/graph.json`, an external AST-only reference built without LLM token use. It is not an app asset and must not be copied into the repository.
