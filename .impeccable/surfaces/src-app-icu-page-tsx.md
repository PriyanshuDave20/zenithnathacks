---
version: 1
slug: "src-app-icu-page-tsx"
primary_target: "src/app/icu/page.tsx"
related_targets:
  - "src/components/communication/icu-board.tsx"
  - "src/components/communication/icu.css"
  - "src/components/communication/flow.css"
  - "src/components/communication/workspace.css"
  - "src/components/communication/session-setup.tsx"
---

# ICU communication preview (/icu)

Mode: Operate. A clinician helps a patient communicate a small set of needs on the clinician’s device. ICU is one of the five initial support choices at `/start`, followed by a patient-ready handoff. Its English-only interface and disconnected eye tracking are disclosed during setup. This frontend-only board currently works by tapping a choice or activating a focused button with the keyboard. `/icu` retains the clinician-account gate.

## Direction contract

THESIS: One clear choice at a time, with room to rest. Keep all six choices within reach on a phone, lead with the selected message, and place caregiver guidance behind a closed disclosure. Make ICU a first-class setup path while visibly identifying the present screen as a manual preview.

OWN-WORLD: Inherit the communication surfaces’ navy header and handoff, white/cool-blue surfaces, deep-blue actions, Figtree headings, Noto Sans text, rounded panels, pill controls, and explicit selected state. Use the same scoped black/yellow high-contrast override. Preserve root `DESIGN.md` and `.impeccable/design.json`; this extends their identity.

STORY: The clinician selects Eye selection · ICU at `/start`, passes the device, and opens the patient’s board. The patient or clinician previews Yes, No, Pain, Help, Move me, or Take a break by tapping or keyboard activation. The chosen label appears in a polite “You chose” status area. Clear preview choice is inside the collapsed Clinician guidance & preview controls section. Pass to clinician hides the board behind a navy handoff. “I’m the clinician” opens a local clinician review of the selected message. Return to patient’s board reopens the board; Finish ICU preview returns to `/start` setup. Back to the board on the handoff also reopens the board. Selection does not transfer to a conversation or summary, alert staff, or trigger a clinical action.

FIRST VIEWPORT: Sticky navy header with Synapse/back link, “ICU · Eye selection,” and High contrast. Intro title and “Interface preview · Eye tracking not connected” badge. A single board panel places the prompt and selection status above six targets: three columns on larger screens, two on phones. At the 390px bedside viewport, compact targets retain icons and short labels while hiding explanatory hints so all six choices stay within reach. A selected target adds a check/Selected label and `aria-pressed`. Closed clinician guidance follows the board; a sticky footer repeats the frontend-preview limit and offers Pass to clinician.

FORM: Ordinary extension within the user-supplied Akash spec and wireframe, with the latest user direction making ICU a first-class setup choice and reducing patient screen density. Carry forward the established concept-roll waiver: Zach, 2026-11-07, verbatim “waive it”; no new world or concept roll.

FINISH: The hover/focus progress bar is only a visual dwell preview; completion does not select. No camera access, calibration, gaze detection, gaze processing, or automatic dwell selection exists here. `IcuBoard` exposes optional `onSelect(event: SelectEvent)` for the input-channel team and currently emits `{ channel: "tap", optionId }` on native button activation, including keyboard activation. The route supplies no callback, so no backend behavior is connected. Never fabricate a gaze event. Selection is local React state, cleared on component cleanup; it is not persisted. Keep reduced-motion support, visible focus, large targets, explicit English-only/input-preview limits, and the device hand-back. Full implementation notes and existing asset/motion provenance: `docs/COMMUNICATION_UI.md`.
