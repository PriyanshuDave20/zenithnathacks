---
version: 1
slug: "src-app-start-page-tsx"
primary_target: "src/app/start/page.tsx"
related_targets: []
---

# Session flow (/start)

Mode: Operate. Users: a clinician and a patient sharing one device (phone, tablet, or laptop) at the bedside or in an exam room, often anxious, tired, or reading in a second language; patients may be Deaf/HoH, low literacy, or unable to speak. Task: get from Start to a usable, understood exchange in seconds. Pinned by docs/PRODUCT.md and the team: stages start -> intake (free-form or guided) -> patient confirms read-back -> handoff -> clinician review -> clinician reply -> patient response with teach-back (loops) -> end. Session state in memory only; always-visible Clear; idle timeout wipes it. Model failures fall back to typed text and never block the visit. Built against src/lib/mocks via src/components/session/api.ts. Fluid on every platform: phone portrait first, tablet, desktop, keyboard, touch, reduced motion, RTL.

## Direction contract

THESIS: One device, two people, one turn at a time. Every screen belongs to whoever is holding it and says so; the handoff is a ritual screen, not a modal. Refuses the dashboard/form-wizard template.

OWN-WORLD: DESIGN.md as built on the home page: navy session bar with holder pill (Clinician navy / Patient blue-soft) and Clear, clinic-white work surface, patient-language content in tailed bubbles, large pill choices and picture tiles, navy clinician summary sheet, logo light blue only on navy. Figtree for what people read and answer, Noto Sans for interface.

STORY: The clinician picks language, mode, and path in two taps; the patient says it their way in their own language and confirms the read-back; the clinician reads a structured summary beside the original and back-translation, replies, and the patient confirms they understood; End clears everything.

FIRST VIEWPORT: Start screen. Navy session bar (mark, "New session", Clear). Clinician holder pill. Language choices as large pills, communication mode as four large choices with icons, path (Speak freely / Answer questions) auto-defaulted by mode, one full-width "Pass to patient" primary at the bottom of the viewport within thumb reach.

FORM: Pinned brief: stages and behavior fixed by docs/PRODUCT.md and the team, so no concept-seed roll ran; position 1 of 1; seed: none (pinned brief, no roll). Roll waived by the user (Zach, 2026-11-07, verbatim: "waive it").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
