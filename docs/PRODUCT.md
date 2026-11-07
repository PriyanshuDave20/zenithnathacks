# Synapse: Product Scope

A translation and communication bridge for clinics, used by doctors and nurses, built for NatHacks 2026 (64 hours).
Decisions here can change; update this file and tell the team.

## Customer and problem
**Customer:** hospitals, clinics, doctors and nurses. The patient is the other party in the conversation, not the buyer.

Today, clinics bridge communication gaps with tablet-based interpreter services. They are expensive, take roughly
15-30 minutes to set up (team estimate; verify before using on a slide), and are tedious to use. Patients who are
Deaf/hard of hearing, mute, low literacy, or speak another language are the most affected.
For ICU patients who cannot speak or move, the current tool is usually a tablet of tap-to-ask buttons, which is
inaccessible to patients who cannot move at all.

## Concept
One app on the clinician's own phone, tablet, or laptop. The patient installs nothing and has no account.
Synapse is a paid app for clinicians, so each clinician has their own account (see Clinician accounts).
The patient uses the same screen to describe their symptoms in their own language and mode; the app translates
and structures it for the clinician. Goal: time from opening the app to a usable exchange measured in seconds, not minutes.

## Patient modes
| Mode | Patient receives | Patient responds with |
|------|------------------|-----------------------|
| Standard / other language | translated text or audio | voice or typing in their language |
| Deaf / hard of hearing | captions, large text | typing or taps |
| Low literacy | simple text, icons, read-aloud | voice or taps |
| Mute | text or speech | taps, typing, text-to-speech |
| ICU (stretch) | simple prompts | eye-gaze selection (body diagram, then narrowed questions) |
| Sign (stretch, proof of concept) | captions or text | a small vocabulary of signs recognized by camera |

Model the patient as `{language, input channel, output channel, reading level}`. New input channels
(tap, speech, eye gaze, sign) plug in without changing the rest of the flow: every channel produces the same
`select(optionId)` event (see `docs/API.md`, Input channels).

## Intake paths (the patient or clinician picks one)
- **Free-form:** the patient just speaks or types what is wrong, in their own words and language.
  Claude extracts the chief complaint, symptoms, duration, and red flags.
- **Guided:** a short sequence of defined questions (the question bank), answered by buttons, pictograms,
  speech, typing, or gaze depending on the patient's mode. Used by default for accessibility modes.
- **Body diagram (guided path):** the patient selects a body region (tap or gaze), and the app narrows to the
  follow-up questions for that region. Built for ICU use but helps every patient.
- Both paths feed the same translate step and produce the same summary shape. A patient can start free-form and
  be asked only the questions they did not cover (nice to have).

## Flow (one device, passed between patient and clinician)
1. **Start (clinician):** pick the patient's language and mode. ~10 seconds.
2. **Patient intake:** free-form or guided (see Intake paths), one step at a time.
3. **Handoff:** clear "pass to clinician" screen; previous person's content is hidden.
4. **Clinician review:** translated, structured summary (chief complaint, symptoms, duration, red flags),
   shown beside the original text with a back-translation check.
5. **Clinician response:** one short step; the clinician's instructions or question are translated or
   simplified into the patient's mode, with a teach-back tap.
6. **End:** session cleared. Nothing is stored.

The clinician can reply and ask follow-ups by passing the device back; the same respond step repeats.
A fully fluid back-and-forth conversation is added after the MVP (see stretch).

## MVP scope
1. Patient intake in the four modes above, in several languages, via free-form or the guided question bank.
2. Claude translation and structured clinician summary, with back-translation.
3. Clinician response step with teach-back.
4. Time-to-first-message and teach-back confirmation as proxy metrics (anonymous counts only).
5. Demo with two synthetic patient personas (for example a Deaf patient and a patient with limited English).
6. Body diagram with tap selection (the ICU eye-gaze work builds on it).

## Stretch (in order)
1. ICU mode: body diagram + narrowed questions answered by webcam eye-gaze (dwell-to-select, large targets).
2. Free back-and-forth conversation (turn-taking with a "who is speaking" control; one mic hears both people).
3. Sign proof of concept: recognize a small vocabulary (for example pain, help, water, yes, no) with on-device
   hand tracking. This is a proof of concept, not sign language translation.
4. Patient joins from their own phone via QR.

## Out of scope / cut
- Patient profiles, patient accounts, visit records, or any stored patient data (see Privacy). Clinician accounts are in scope (below).
- Cross-visit personalization and ML layers (see `docs/ML.md`).
- Full sign language translation, EHR integration, real SMS/email delivery.

## Clinician accounts (decided 2026-11-07, Zach)
- Synapse is a paid app used by clinicians, so each clinician signs in with their own account. Patients never have one.
- Sign-in: email and password, plus "Continue with Google". Forgot-password by email link.
- The account holds only the clinician's own details: name, role (doctor, nurse, other), clinic or hospital, languages they speak, and their plan. **Never any patient data**, and no visit history.
- Sign-in is required before `/start`; the landing page stays public.
- Billing is out of scope for the hackathon: the plan is shown read-only.
- Frontend runs on a mock (`src/lib/mocks/auth.ts`) until Backend 1 builds the routes in `docs/API.md` ("Clinician accounts").

## Privacy and data handling
- **No patient data is stored.** Session state lives in browser memory and is cleared at the end of the visit,
  by a clear button, and on an idle timeout. No patient, visit, or message tables.
- **No identifiers collected.** No name field, no patient ID. The UI tells users not to say names or personal details.
- **Prompts and redaction.** Prompts instruct the model to omit names, dates of birth, phone numbers, and addresses.
  A simple pre-send redaction pass (phone, email, dates) is a backend task.
- **Honest limits.** Free speech can still contain identifiers, and text is sent to a model provider.
  Say "designed to avoid identifiable data", never "no PHI is ever sent" or "HIPAA compliant".
  A real deployment would need a business associate agreement / zero-retention terms with the model provider.
- Anonymous analytics only: counts such as time to first message, mode used, teach-back confirmed. No content.
- Demo uses synthetic data only.
- **Camera (gaze and sign):** video is processed on the device only. Never upload, store, or log frames.

## Safety and claims
- Webcam eye-gaze is low-cost, not clinical-grade; say "no extra hardware", not "accurate". Use large targets.
- Synapse is a communication aid, not a diagnostic tool and not a certified interpreter.
  Clinicians make all clinical decisions. Do not claim legal compliance with interpreter requirements.
- Show the clinician the original text and a back-translation so they can judge reliability.
- Say "designed to reduce communication friction", not "reduces misdiagnosis" or "improves outcomes".
- Statistics (setup time, cost, prevalence) are unverified; check each against its source before putting it on a slide.

## Stack
Next.js (App Router), React, Tailwind v4. API via Next.js route handlers (stateless; no Express).
LLM: Claude for now, behind a provider-neutral wrapper (`src/lib/server/llm.ts`) so we can switch models later. Speech: browser Web Speech API with typed fallback; text-to-speech for mute patients.
Mobile-first at ~390px. Prisma/PostgreSQL stay in the scaffold but are not needed while nothing is stored.

## Differentiation
Instant setup on the clinician's own device versus 15-30 minute interpreter tablets; covers Deaf, mute,
low-literacy, and language barriers in one tool; nothing stored. Compared with LanguageLine (live interpreting),
CardMedic (pre-written translated scripts), and ICU tap-button tablet apps.
