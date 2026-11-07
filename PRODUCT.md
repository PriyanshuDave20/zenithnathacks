# Product

<!-- impeccable:product-schema 1 -->

Summary of `docs/PRODUCT.md` for design tools. `docs/PRODUCT.md` is the source of truth; if they disagree, it wins.

## Platform

web

## Users
- **Primary (customer):** doctors and nurses in hospitals and clinics, using Synapse on their own phone, tablet, or laptop during a visit. The clinic is the buyer. Synapse is a paid app: each clinician signs in with their own account, which holds only their own details (name, role, clinic, languages, plan), never patient data.
- **Other party:** the patient, who uses the same screen when it is passed to them. They install nothing and have no account. Patients may speak another language, be Deaf or hard of hearing, have low literacy, or be unable to speak. ICU patients who cannot speak or move are a stretch audience.
- **Evaluators:** NatHacks 2026 judges (64-hour hackathon) seeing the project on a projector and on phones.

## Product Purpose
A translation and communication bridge between clinician and patient. The patient describes symptoms by voice, text, pictograms, or guided questions, in their own language and mode; Claude translates and structures it into a clinician summary (chief complaint, symptoms, duration, red flags) shown beside the original text and a back-translation. The clinician replies; the reply is simplified into the patient's language and mode, with a teach-back check. Success: a usable exchange within seconds of opening the app, instead of minutes.

## Positioning
Instant setup on the clinician's own device, versus tablet interpreter services that are expensive and slow to set up. One tool covers language, Deaf/HoH, low-literacy, and mute barriers. Nothing is stored. Compared against LanguageLine (live interpreting), CardMedic (pre-written translated scripts), and ICU tap-button tablet apps.

## Operating Context
- One device passed between clinician and patient. Flow: start (clinician picks language and mode) → patient intake (free-form or guided, optional body diagram) → handoff screen → clinician review → clinician response with teach-back → end (session cleared).
- Patient modes: standard/other language, Deaf/HoH, low literacy, mute; stretch: ICU eye-gaze, small-vocabulary sign proof of concept.
- The marketing landing page (`/`) is separate from the app; the app is entered from its own start page.

## Capabilities and Constraints
- Web app, mobile-first (~390px). Next.js App Router, React, Tailwind v4. Claude for translation. Browser Web Speech API with typed fallback; text-to-speech.
- **Privacy:** no patient data stored, no identifiers collected, session lives in browser memory and clears on end, clear button, and idle timeout. Camera video (gaze, sign) never leaves the device.
- **Claims:** a communication aid, not a diagnostic tool and not a certified interpreter. Say "designed to avoid identifiable data" and "designed to reduce communication friction". Never say "HIPAA compliant", "no PHI is ever sent", "reduces misdiagnosis", "improves outcomes", or that webcam gaze is "accurate".
- Undecided: lane owners; final logo file.

## Brand Commitments
- Name: **Synapse**. Colours: navy, light blue, white (from Akash's `Color Theme and Logo.pdf`). Logo: a flowing "S" of two interlocking swooshes (white and light blue), wordmark SYN (white) APSE (light blue) on navy. Visual details live in `DESIGN.md`.

## Evidence on Hand
- Synthetic demo data only; two synthetic patient personas are planned (e.g. a Deaf patient and a patient with limited English).
- Draft medical jargon list and history questions: `src/lib/questions/medical_terms.json` (189 terms, 17 questions, team-authored, unreviewed).
- **Absent, do not fabricate:** testimonials, customers, clinical results, pilot data. Setup-time (15-30 min) and cost figures are unverified team estimates; do not show them as fact until checked against a source.

## Product Principles
1. Seconds, not minutes: every screen serves getting to a usable exchange fast.
2. The patient's own words and mode come first; the clinician always sees the original and a back-translation.
3. Nothing stored, nothing identifying.
4. Honest about limits: a communication aid that supports clinicians, who make every clinical decision.

## Accessibility & Inclusion
Built for people facing communication barriers: large tap targets, high contrast, no audio-only cues for Deaf/HoH users, read-aloud and pictograms for low literacy, text-to-speech for mute patients, `lang`/`dir` on every patient-language block, right-to-left support.
