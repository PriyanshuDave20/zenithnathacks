---
version: 1
slug: "src-app-start-page-tsx"
primary_target: "src/app/start/page.tsx"
related_targets:
  - "src/components/communication/workspace.tsx"
  - "src/components/communication/workspace.css"
  - "src/components/communication/motion.tsx"
---

# Communication workspace (/start)

Mode: Operate. A clinician and patient share one phone, tablet, or laptop at the bedside or in an exam room. Patients may use another language, be Deaf/HoH, have low literacy, or be unable to speak. The task is to build a checked exchange through speech, pictures, or text, then review the communication recap. This replaces the earlier setup-and-question wizard with a conversation workspace. The user-supplied Akash system spec and ASCII wireframe fix this composition within the established Synapse identity.

Implementation: `src/components/communication/workspace.tsx`, its scoped stylesheet, and `motion.tsx`; `/start` retains the existing clinician-account gate. Translation and reply calls use the unchanged mock adapter in `src/components/session/api.ts`. There are four mock languages: English, Spanish, Arabic, and Simplified Chinese. This is a synthetic demonstration, not a full translation service.

## Direction contract

THESIS: One device, two people, a visible conversation. Keep the checked messages beside the next message on wide screens, with a compact, persistent accessibility rail and a clear holder indicator. Clinical review remains a separate turn: the navy handoff replaces the workspace and hides the summary until the holder chooses “I’m the clinician.” This is a holder assertion, not authentication.

OWN-WORLD: Inherit `DESIGN.md`: navy header and raised-navy controls, white and cool-blue work surfaces, deep-blue actions, rounded panels, pill choices, and opposing tailed speech bubbles. Figtree headings sit over Noto Sans interface and message text, with inherited Arabic and Chinese font families. The user-requested black/yellow high-contrast mode is a scoped accessibility override on this workspace; it does not recolor the global system. Preserve root `DESIGN.md` and `.impeccable/design.json`.

STORY: Choose speaker, patient language, and communication mode in place. The patient speaks, points, or types; a read-back must be confirmed before the message enters the conversation. The clinician can add a reply through the same composer. Pass to clinician hides the workspace behind a navy handoff, then opens patient recap and clinician summary side by side. Reply returns to the composer; teach-back records yes, no, or unsure against the latest reply. Clear and End require confirmation and remove the conversation from memory.

FIRST VIEWPORT: Sticky navy header with Synapse, holder, and Clear; accessibility rail beneath it. The rail exposes modes, 100/125/150% text, high contrast, and eligible read-aloud controls. At 1000px and below it collapses into a persistent “Accessibility · mode · size” row with an expandable, height-limited control area. The main area introduces the conversation and synthetic-demo status, then shows a conversation log and input panel in a 1.4:1 split above 1000px; below that, the panels stack. Sticky footer actions provide interpreter guidance and Pass to clinician. No developer inspector or device-preview controls belong in this patient flow.

FORM: Ordinary extension of the incumbent world. The supplied spec fixes the composition; no new world or concept roll. Preserve the existing concept-roll waiver: Zach, 2026-11-07, verbatim “waive it”; position 1 of 1; seed: none (pinned brief, no roll).

FINISH: Surface implementation and limits are documented in `docs/COMMUNICATION_UI.md`. Browser review and project checks belong to the implementation handoff. Keep synthetic/demo language visible. Do not imply that the 0–10 pain control produces structured severity, that a manual sound cue detects the room, that interpreter guidance contacts anyone, or that the recap generates diagnoses, vitals, medication, or orders. Content lives in browser memory, clears on route hiding/pagehide, and clears after the five-minute idle window (warning during its final 30 seconds). Respect reduced motion and patient `lang`/`dir`.
