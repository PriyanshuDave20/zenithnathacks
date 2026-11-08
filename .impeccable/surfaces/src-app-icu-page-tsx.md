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

# Eye communication board (/icu)

Mode: Operate. The clinician setup defaults to Eye mode and hands off to an English six-choice board. Patient can enable the site-wide eye control, complete 30-second moving-dot calibration, then dwell for two seconds on Yes, No, Pain, Help, Move me, or Take a break. Tap and keyboard remain available. No camera starts without opt-in.

THESIS: One clear choice at a time, with room to rest. All six choices remain within reach, confirmed selection is explicit, and guidance is collapsed.

OWN-WORLD: Preserve Synapse navy, cool blue and white, Figtree/Noto Sans, rounded targets, high contrast and existing handoff/review screens.

STORY: Clinician selects Eye mode, hands over device, patient enables/calibrates gaze or uses touch/keyboard, then chooses a phrase. Pass to clinician hides the board; clinician acknowledges and reviews the exact phrase. Choices do not notify staff or trigger clinical actions. State remains browser memory only.

INPUT: Small gaze cursor carries the actual dwell ring; hover does not pretend to select. Invalid calibration retries, blinks/stale frames cancel dwell, and repeated activation requires looking away. Recalibrate after moving the device or head. Viewport resize begins calibration again.

LANDING: The Eye example is a camera-free scripted demonstration with an automatic cursor, two-second dwell, confirmed message and clinician preview. Pause/Play, reduced-motion static example and hidden/offscreen suspension are supported.

VERIFICATION: 64 tests pass, lint has zero errors. Typecheck passes; live-camera/mobile/desktop visual verification remains pending; no accuracy guarantee.
