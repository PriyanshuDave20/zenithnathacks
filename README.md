# Synapse

A communication bridge for clinics. Doctors and nurses use it on their own phone, tablet or laptop; the patient installs nothing. Patients describe symptoms by voice, text, pictograms or eye gaze in their own language and mode, and Synapse translates and structures it for the clinician. Built for **NatHacks 2026** (64-hour hackathon).

**Live app:** https://synapsenathacks.vercel.app

> Synapse is a communication aid, not a diagnostic tool or a certified interpreter. The demo uses synthetic data only.

## The problem
Patients who are Deaf or hard of hearing, mute, have low literacy, or speak another language are usually served by tablet-based interpreter services that are expensive and slow to set up. ICU patients who cannot speak or move often cannot use tap-to-ask tablets at all.

## What it does
1. **Start (clinician):** pick the patient's language and mode in about ten seconds.
2. **Patient intake:** free-form (speak or type) or a guided question sequence with pictograms and a body diagram. ICU mode uses webcam eye gaze (dwell-to-select).
3. **Clinician review:** a structured summary (chief complaint, symptoms, duration, red flags) beside the original text with a back-translation check.
4. **Clinician reply:** translated or simplified into the patient's mode, with a teach-back confirmation.
5. **End:** the session is cleared.

Pre-generated speech is available in English, Spanish, Arabic and Simplified Chinese. Translations other than English are drafts pending fluent and clinical review.

## Privacy
- No patient data is stored: no patient, visit or message tables. Session state is browser memory only.
- No identifiers are collected, and prompts instruct the model to omit them. Text is still sent to the model and translation providers, so we say "designed to avoid identifiable data", not "HIPAA compliant".
- Camera video for eye gaze is processed on the device and never uploaded.
- Only clinicians have accounts, and the account holds only the clinician's own profile.

## Tech stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma 7 with PostgreSQL (clinician profiles only), Better Auth, MediaPipe (in-browser eye gaze), Claude behind a swappable wrapper (`src/lib/server/llm.ts`), Azure Translator and Azure Speech, deployed on Vercel.

## Run it locally
Requires Node 24.x.

```bash
git clone https://github.com/PriyanshuDave20/zenithnathacks.git && cd zenithnathacks
./scripts/setup.sh        # installs dependencies and prepares the project
npm run dev               # http://localhost:3000
```

Configuration lives in `.env` (gitignored); copy variable names from `.env.example`. You need provider keys for the model, Azure services, a PostgreSQL database and auth/Google OAuth to use every feature. Hosting setup is in [`docs/VERCEL.md`](docs/VERCEL.md) and auth setup in [`docs/AUTH.md`](docs/AUTH.md).

Other commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (219 offline tests).

Judges: use the live app above. Open it on a phone-sized viewport (about 390px) for the intended layout, and use synthetic data only.

## Project layout
- `src/app/**`, `src/components/**`: pages and UI
- `src/app/api/**`, `src/lib/server/**`: stateless API routes and server logic
- `src/components/input/**`, `src/lib/input/**`: input channels (tap, speech, eye gaze)
- `src/lib/contracts/**`, `docs/API.md`: shared contracts

## Supporting materials
- Product scope and decisions: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- API contracts: [`docs/API.md`](docs/API.md)
- Submission text (summary and about): [`docs/SUBMISSION.md`](docs/SUBMISSION.md)
- Team workflow and lanes: [`docs/TEAM.md`](docs/TEAM.md), [`AGENTS.md`](AGENTS.md)
- Slides / demo video: 
  slides: https://onedrive.live.com/:p:/g/personal/5c3f132d677d9b84/IQCqKnLCqzn-TbRuxwLVix6XAWKH3hq3lcWNpRiCs_AyT8I?rtime=UAlQVSs-30g&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3AvYy81YzNmMTMyZDY3N2Q5Yjg0L0lRQ3FLbkxDcXpuLVRiUnV4d0xWaXg2WEFXS0gzaHEzbGNXTnBSaUNzX0F5VDhJP2U9aWl1WmFV

## Credits
Built during NatHacks 2026 by the team (GitHub: PremD27, PriyanshuDave20, and teammates). Developed with AI coding assistants (Claude Code and Codex), with human review. Third-party services and libraries: Claude (Anthropic), Azure Translator and Speech, MediaPipe, Better Auth, Prisma, Next.js, Vercel.

All code was written during the 64-hour natHacks weekend.
