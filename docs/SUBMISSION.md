# NatHacks 2026 Submission Text

Copy-paste text for the submission form. Limits: Project Summary max 250 words, About the Project max 600 words.
Edit the inspiration paragraph so it reflects the team's real story before submitting.

---

## Project Summary (about 235 words, limit 250)

Synapse is a communication bridge for clinics. Doctors and nurses use it on their own phone, tablet or laptop, and the patient installs nothing.

**Problem.** When a patient is Deaf or hard of hearing, mute, has low literacy, or speaks another language, clinics usually fall back on tablet-based interpreter services that are expensive and slow to set up. For ICU patients who cannot speak or move, tap-to-ask tablets are not usable at all.

**Approach.** The clinician picks the patient's language and mode in about ten seconds. The patient then describes their symptoms in their own words, by voice, typing, pictograms, or a guided question sequence with a body diagram. An LLM (Claude, behind a swappable wrapper) translates and structures this into chief complaint, symptoms, duration and red flags, shown beside the original text with a back-translation check. The clinician replies, and the reply is translated or simplified into the patient's mode, with a teach-back confirmation. For ICU patients, a webcam eye-gaze mode lets them choose body regions and answers by looking; video is processed on the device only.

**Results.** A working, deployed web app with clinician accounts, translation and structured summaries, guided and free-form intake, pre-generated speech in English, Spanish, Arabic and Simplified Chinese, and an eye-gaze mode, backed by 219 automated tests.

**Privacy.** No patient data is stored. Session state lives in browser memory only, and prompts instruct the model to omit identifiers. The demo uses synthetic data. Synapse is a communication aid, not a diagnostic tool or certified interpreter.

---

## About the Project (about 520 words, limit 600)

### What inspired us
Clinics often bridge language and ability gaps with tablet-based interpreter services. They are costly, take many minutes to set up, and are tedious to use mid-visit. The people most affected are patients who are Deaf or hard of hearing, mute, have low literacy, or speak another language. The gap is widest in the ICU, where a patient who cannot speak or move is usually offered a tablet of tap-to-ask buttons that they physically cannot press. We wanted a tool where the time from opening the app to a usable exchange is measured in seconds, and where the clinician is the customer, not the patient.

### What we built
Synapse runs on the clinician's own device. The clinician picks the patient's language and mode, hands the device over, and the patient describes what is wrong by voice, typing, pictograms, or a guided question bank with a tappable body diagram. Claude turns that into a structured clinician summary (chief complaint, symptoms, duration, red flags) shown next to the original text and a back-translation so the clinician can judge reliability. The clinician's reply is translated or simplified into the patient's mode and confirmed with a teach-back tap. Every input channel (tap, speech, eye gaze) emits the same `select` event, so new channels plug in without changing the flow. The ICU mode uses webcam eye gaze with dwell-to-select and large targets, with no extra hardware.

### How we built it
Next.js (App Router), React and Tailwind v4, mobile-first at about 390px. Stateless API routes call Claude through a provider-neutral wrapper so the model can be swapped. Azure Translator and Azure Speech back the guided question bank, and we pre-generated the fixed clinical phrases as audio so guided playback needs no runtime synthesis. Gaze uses MediaPipe tasks running in the browser. Clinician accounts (their own profile only) use Better Auth with Prisma and PostgreSQL, deployed on Vercel. We split the work into strict lanes (frontend, API, input channels, contracts) with a shared task board and handoff log, and used AI coding agents in each lane, with independent review before merging.

### What we learned
- Privacy is a design constraint, not a feature. Deciding early that no patient data is ever stored removed whole categories of risk and shaped the architecture: session state in browser memory, anonymous count-only metrics, and prompts that instruct the model to omit identifiers.
- Accessibility modes are not skins. Deaf, mute, low-literacy and ICU patients need different input and output channels, so we modelled the patient as language, input channel, output channel and reading level.
- Being honest about limits matters in a clinical setting. Webcam gaze is low-cost, not clinical-grade, and free speech can still contain identifiers.
- Parallel work needs written contracts. Agreeing on API shapes and a shared `select` event let several people and agents build at once.

### Challenges
- **Speech across languages.** Browser speech synthesis was inconsistent and English-biased, so we moved guided prompts to pre-generated Azure audio for English, Spanish, Arabic (including right-to-left layout) and Simplified Chinese.
- **Eye gaze on a webcam.** Calibration, dwell timing, and keeping clinician controls from being triggered by the patient's gaze took many iterations. It has not been validated on a physical device or with real patients.
- **Staying private while using cloud AI.** Text still goes to a model provider. We redact obvious identifiers and instruct the model to omit them, but we describe this as "designed to avoid identifiable data" rather than claiming compliance. A real deployment would need appropriate agreements with providers.
- **Integration under time pressure.** Many simultaneous branches meant merge conflicts in shared files, so we kept lanes tight and logged every handoff.
- **Translation quality.** Our non-English clinical wording is machine-generated and still needs fluent and clinical review before real use.

### What's next
Clinical and native-speaker review of translations, real-device testing of gaze, free back-and-forth conversation, a small-vocabulary sign recognition proof of concept, and letting patients join from their own phone by QR code.
