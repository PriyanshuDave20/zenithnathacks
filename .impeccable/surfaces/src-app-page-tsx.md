---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Home page (/)

Mode: Persuade. Audience: NatHacks 2026 judges on a projector and on phones. Primary action: Start a session (links to `/start`, the separate app entry; the session process begins there, never on this page). Single long page: a demo of the clinician/patient workflow. Quality bar pinned by the team: meuze.ai (structure and polish only; never its content, imagery, or branding). Visual world pinned: DESIGN.md (navy / light blue / white, soft and rounded). Proof is synthetic demonstration data, labelled; no statistics, customers, or outcomes.

## Direction contract

THESIS: The page is the visit. One device passes between patient and clinician, and the page performs that exchange, refusing the category's hero-plus-feature-cards template.

OWN-WORLD: Clinic white ground, Synapse Navy bands for the hero and the clinician's voice, logo light blue as signal on navy and as the one action's fill on navy (DESIGN.md primary-on-navy), Signal Blue for actions on white. Rounded sheets and tailed chat bubbles, pill controls, a phone frame as the product carrier, soft navy-tinted shadows, Figtree display over Noto Sans body.

STORY: A judge sees a patient sentence become a clinician summary in the first viewport, scrolls the six steps of a real visit on a pinned phone, plays the modes, learns what is never stored, and presses Start.

FIRST VIEWPORT: Navy field. Logo lockup and Start in the bar. Headline left (desktop) or top (390px); the hero phone plays one synthetic exchange (Spanish sentence, read-back, clinician summary) with a visible pause control; Start a session as the single light-blue pill (navy text, arrow disc), the most prominent control; the header Start is a quiet outline.

FORM: Pinned brief. Authority, in Zach's words to the team: "a meuze.ai-level quality landing page in the Synapse theme: a workflow showcase with a Start button to a separate start page" (docs/TASKS.md, landing page row), refined on 2026-11-07 to "one phone flow with the entire page ... blend the pages better and make it easy on the eye". The structure is pinned, so no concept-seed roll ran; position 1 of 1; seed: none (pinned brief, no roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

### Landing copy and mobile pulse (Zach, 2026-11-08)

Audience refinement: judges and investors. Explain the communication barrier, demonstrate the two-way workflow and shared-device approach, and distinguish browser-memory patient messages from persisted clinician profiles. Lead the lower page with the communication benefit; retain explicit diagnostic/interpreter and provider-processing limits without suggesting Synapse cannot help people communicate. No traction, clinical-result or compliance claims.

Below 768px only, start the heart-rate trace from the left inset under the header, retain its full waveform at both endpoints, and fit the canvas to dynamic viewport changes. Preserve desktop's centered emblem arrival. Keep the incumbent visual world and demo interactions.

## Motion update (Zach, 2026-11-07)

The snake climbs the stationary pole, reaches the header, and turns into a small heartbeat reading-progress marker. User explicitly requested integration into the website and removal of the separate testing page. Keep existing home-page content and pinned phone; honour reduced motion and mobile fallback.

### Continuous perimeter refinement (Zach, 2026-11-07)

Centre and size the staff to the text–phone gap. The snake shoots upward to the header above the staff, then becomes one monitor flow proceeding clockwise across the top-right corner and down the right edge. Never send it back to the top-left. Preserve one pinned phone, existing content and the mobile/reduced-motion fallback.

### Live signal refinement (Zach, 2026-11-07)

Animate the ECG profile itself inside the progress marker. On landing above the staff, show the already-filled trail from the left edge so the marker looks in motion from its first frame. Preserve the clockwise top/right route; Pause/Play demo also controls the waveform, with reduced-motion and hidden-tab alternatives.

### Emblem scale and blended origin (Zach, 2026-11-07)

Give the staff and snake more presence and detail while retaining their centered gap beside the phone. Blend the monitor origin: the tail unfolds backward from the arriving snake with a feathered start, rather than appearing as an already-solid bar. Keep live ECG and the clockwise top/right route.
