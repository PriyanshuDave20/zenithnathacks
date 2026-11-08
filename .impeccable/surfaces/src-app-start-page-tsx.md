---
version: 1
slug: "src-app-start-page-tsx"
primary_target: "src/app/start/page.tsx"
related_targets:
  - "src/components/communication/workspace.tsx"
  - "src/components/communication/session-setup.tsx"
  - "src/components/communication/flow.css"
  - "src/components/communication/workspace.css"
  - "src/components/communication/motion.tsx"
  - "src/components/session/patient-screens.tsx"
---

# Clinician setup and patient communication (/start)

Mode: Operate. A clinician and patient share one phone, tablet, or laptop at the bedside or in an exam room. Patients may use another language, be Deaf/HoH, have low literacy, be unable to speak, or need the ICU board. The clinician chooses language and support, then passes the device. The patient gets one focused task at a time, confirms a read-back, and passes it back for summary and reply. The latest user direction replaces the overwhelming shared patient workspace; the conversation dashboard now serves clinician review and reply.

Implementation: `CommunicationWorkspace`, `SessionSetup`, `flow.css`, the existing workspace stylesheet, and `motion.tsx`; `/start` retains the clinician-account gate. Patient stages reuse `IntakeFree`, `IntakeGuided`, and `ConfirmReadBack`, with a narrow typed-fallback submission fix in the existing frontend patient component. Translation and reply calls use the unchanged mock adapter in `src/components/session/api.ts`. Four mock languages are available: English, Spanish, Arabic, and Simplified Chinese. This is a synthetic demonstration, not a full translation service. Backend, contracts, input internals, mocks, and shared configuration remain unchanged.

## Direction contract

THESIS: The clinician prepares; the patient communicates; the device passes clearly between them. Keep language, support settings, the conversation log, and summary tools in clinician stages. Patient intake and read-back use focused localized screens, with a full-screen handoff before each holder’s turn. Handoff actions assert the holder; they do not authenticate them.

OWN-WORLD: Inherit `DESIGN.md`: navy header and handoff screens, white and cool-blue work surfaces, deep-blue actions, rounded panels, pill choices, and opposing tailed speech bubbles in clinician conversation. Figtree headings sit over Noto Sans interface and message text, with inherited Arabic and Chinese font families. The user-requested black/yellow high-contrast mode is a scoped accessibility override; it does not recolor the global system. Preserve root `DESIGN.md` and `.impeccable/design.json`.

STORY: Clinician setup offers four mock languages and five modes: Speak & translate, Deaf / hard of hearing, Pictures & simple questions, Can’t speak, and Eye selection · ICU. Non-ICU modes offer free or guided intake; Standard defaults to free, other modes to guided. Optional display/read-aloud controls stay collapsed. Pass to patient opens a navy patient-ready screen; a localized ready action opens focused intake. ICU instead opens `/icu`, with its English-only preview limit disclosed. Intake leads to read-back, confirmation, and Pass to clinician. “I’m the clinician” opens dual summaries; localized Back returns to focused intake or teach-back. Reply opens the clinician conversation and composer; sending leads through patient-ready to teach-back, then back through Pass to clinician. Ask for more details repeats focused intake; Change language or mode returns to setup. Clear returns to setup; End opens Session cleared.

FIRST VIEWPORT: Sticky navy header with Synapse, holder, and Clear. Setup leads with “Set up a comfortable conversation,” language cards, and five support choices; larger screens use two columns and phones stack at 760px. A sticky Pass to patient action follows the choices. Display and read-aloud options is a closed details control with 100/125/150% text, high contrast, and eligible Read replies aloud preference, hidden for Deaf/HoH and ICU. Existing guided read buttons and low-literacy/mute body-part speech retain their behavior. Patient stages show localized intake or read-back, without the dashboard or mode/language toolbar. Clinician conversation retains its 1.4:1 log/composer split above 1000px and stacks below. Its workspace, accessibility toolbar, and footer require clinician role. No developer inspector or device-preview controls belong in patient intake.

FORM: Ordinary extension of the incumbent world. The supplied Akash system spec and ASCII wireframe remain visual references; the latest patient-flow direction governs composition. Preserve the existing concept-roll waiver: Zach, 2026-11-07, verbatim “waive it”; position 1 of 1; seed: none (pinned brief, no roll).

FINISH: Surface implementation and limits are documented in `docs/COMMUNICATION_UI.md`; browser review and project checks belong to the implementation handoff. Guided intensity uses the existing 1–5 mock question, not the former workspace’s extra 0–10 control. Do not imply structured severity, ambient sound detection, a placed interpreter call, or generated diagnoses, vitals, medication, or orders. Failed patient translation offers retry or clearly identified untranslated handoff. Inputs, requests, conversation, and summaries remain in browser memory; clearing invalidates late responses. Route cleanup/pagehide resets to setup. Active stages, including setup with retained content, warn after 4 minutes 30 seconds and clear after 5 minutes idle. Respect reduced motion and patient `lang`/`dir`. Preserve the supplied Gemini PNG and motion ZIP provenance recorded in the implementation notes.
