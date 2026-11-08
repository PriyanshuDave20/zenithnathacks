---
version: 1
slug: "src-app-icu-page-tsx"
primary_target: "src/app/icu/page.tsx"
related_targets:
  - "src/components/communication/icu-board.tsx"
  - "src/components/communication/icu.css"
  - "src/components/communication/workspace.css"
---

# ICU communication preview (/icu)

Mode: Operate. A clinician helps a patient communicate a small set of needs on the clinician’s device. This frontend-only extension previews an eye-selection board; it currently works by tapping a choice or activating a focused button with the keyboard. `/icu` retains the existing clinician-account gate.

## Direction contract

THESIS: One clear choice at a time, with room to rest. Large, quiet choices support a future input-channel integration while visibly identifying the present screen as a preview.

OWN-WORLD: Inherit the communication workspace’s navy header, white/cool-blue surfaces, deep-blue actions, Figtree headings, Noto Sans text, rounded panels, pill controls, and explicit selected state. Use the same scoped black/yellow high-contrast override. Preserve root `DESIGN.md` and `.impeccable/design.json`; this is an extension of their identity, not a replacement.

STORY: The clinician opens ICU from `/start`. The patient or clinician previews Yes, No, Pain, Help, Move me, or Take a break using a tap or keyboard activation. The chosen label appears in a polite status area and can be cleared. Back to conversation returns to `/start`. A choice does not alert staff or trigger a clinical action.

FIRST VIEWPORT: Sticky navy header with Synapse/back link, “ICU · Eye selection,” and High contrast. Intro title and “Interface preview · Eye tracking not connected” badge. Two-column choice grid beside a clinician guidance sheet on wide screens; the sheet follows the board at 1000px and below. Each target has an icon, short label, explanatory hint, and a selected check/label. Footer repeats the frontend-preview limit and provides Back to conversation.

FORM: Ordinary extension fixed by the user-supplied Akash spec and wireframe. Carry forward the established concept-roll waiver: Zach, 2026-11-07, verbatim “waive it”; no new world or concept roll.

FINISH: The hover/focus progress bar is only a visual dwell preview; completion does not select. No camera access, calibration, gaze detection, gaze processing, or automatic dwell selection exists here. `IcuBoard` exposes optional `onSelect(event: SelectEvent)` for the input-channel team and currently emits `{ channel: "tap", optionId }` on native button activation, including keyboard activation. The route supplies no callback. Do not emit or imply gaze events until the input-channel team connects a real input source. Selection is local React state, cleared on component hiding/unmounting; it is not persisted. Keep reduced-motion support, visible focus, large targets, and the explicit preview limitation. Full implementation notes: `docs/COMMUNICATION_UI.md`.
