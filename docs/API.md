# Synapse: API Contracts

Draft for the team to agree in Phase 1. Source of truth for types is `src/lib/contracts/` (zod schemas);
this file explains them. Change a contract by PR and tell the team first. Frontend builds against `src/lib/mocks/`
until the real route lands.

All routes are stateless Next.js route handlers. **Nothing is stored.** Do not log request or response bodies.
Do not accept or return names or other identifiers.

## Shared types
```ts
type Mode = "standard" | "deaf_hoh" | "low_literacy" | "mute";
type Language = string; // BCP-47, e.g. "en", "es", "ar"
type ReadingLevel = 1 | 2 | 3 | 4 | 5;

type PatientContext = {
  language: Language;
  mode: Mode;
  readingLevel: ReadingLevel; // default 3
};
```

## POST /api/translate
Patient input, translated and structured for the clinician.

Request:
```ts
{
  context: PatientContext;
  inputs: {
    questionId?: string;   // set for guided answers (see Question bank); absent for free-form speech or text
    kind: "text" | "speech_transcript" | "pictogram" | "option";
    value: string;         // text, transcript, pictogram id, or option id
  }[];
}
```
Free-form and guided inputs can be mixed in one request. Option and pictogram answers carry pre-written
English labels from the question bank, so they are not machine-translated.
Response:
```ts
{
  original: string;              // redacted patient text, as given
  translated: string;            // clinician's language (default "en")
  backTranslation: string;       // translated text rendered back into the patient's language
  summary: {
    chiefComplaint: string;
    symptoms: string[];
    duration?: string;
    redFlags: string[];
  };
  lowConfidence: { phrase: string; reason: string }[];
  redactions: number;            // count of masked identifiers; never the values
}
```

## POST /api/respond
Clinician's reply, simplified for the patient's mode and reading level.

Request:
```ts
{ context: PatientContext; message: string }
```
Response:
```ts
{
  patientText: string;           // in patient's language and reading level
  readAloudText: string;         // plain text suitable for text-to-speech
  teachBackPrompt: string;       // a simple confirmation question in the patient's language
}
```

## POST /api/metrics
Anonymous counts only. No content, no identifiers.
```ts
{ event: "session_started" | "first_message" | "teachback_confirmed"; mode: Mode; msSinceStart?: number }
```

## Question bank (data, not a route)
Lives in `src/lib/questions/`. Owned by Backend 1; read by the frontend and the body diagram.
```ts
type Question = {
  id: string;                     // e.g. "pain_duration"
  text: Record<Language, string>; // pre-translated for the demo languages
  options: { id: string; label: string; pictogram?: string; text: Record<Language, string> }[];
  followsRegion?: RegionId;       // shown only after this body region is selected
};
```

## Input channels (browser only, no route)
Every way a patient answers (tap, speech, gaze, sign) produces the same event, so the patient flow does not
care which one is used. Types live in `src/lib/contracts/input.ts`.
```ts
type RegionId = "head" | "neck" | "chest" | "abdomen" | "back" | "left_arm" | "right_arm" | "left_leg" | "right_leg";
type InputChannel = "tap" | "speech" | "gaze" | "sign";
type SelectEvent = { channel: InputChannel; optionId: string };
```
- Question screens render options as large targets and listen for `select(optionId)`.
- The body diagram takes `regions` as a prop and emits a `RegionId`; the question bank maps a region to its
  follow-up questions (`followsRegion`).
- Video from the camera stays on the device. Nothing is uploaded, stored, or logged.

## Clinician accounts (draft, 2026-11-07)
Clinician-only accounts (their own profile). Never patient data. The frontend uses `src/lib/mocks/auth.ts` through
`src/components/auth/api.ts`; swap that file to these routes. Sessions should be an httpOnly, Secure, SameSite=Lax cookie;
passwords hashed server-side (argon2/bcrypt) and never logged. Server-side checks must gate `/start` too (the client gate is UX only).

```ts
type ClinicianRole = "doctor" | "nurse" | "other";
type ClinicianProfile = {
  id: string;
  email: string;
  name: string;
  role: ClinicianRole;
  clinic: string;
  languages: string[];            // BCP-47 codes the clinician speaks
  plan: { name: string; status: "active" | "trial"; renews: string }; // read-only for now
  provider: "password" | "google";
};
```
- `POST /api/auth/signup` `{ email, password, name, role, clinic }` -> `ClinicianProfile` (sets session). 409 `exists`, 400 `weak_password` (min 8).
- `POST /api/auth/signin` `{ email, password }` -> `ClinicianProfile`. 401 `invalid` (same message for unknown email or wrong password).
- `GET /api/auth/google` -> redirect to Google OAuth; callback sets the session and redirects to `next` (relative paths only).
- `POST /api/auth/forgot-password` `{ email }` -> 204 always (no account enumeration); emails a reset link.
- `POST /api/auth/signout` -> 204 (clears session).
- `GET /api/me` -> `ClinicianProfile` or 401.
- `PATCH /api/me` `{ name?, role?, clinic?, languages? }` -> `ClinicianProfile`.

Errors use the shared `{ error: { code, message } }` shape. Prisma: one `Clinician` table (no patient tables), plus whatever
the session/OAuth library needs.

## Errors
`{ error: { code: string; message: string } }` with a normal HTTP status. Model failures return 502;
the frontend must show a typed-fallback state, never block the visit.

## Later (stretch, not in MVP)
Turn-taking conversation endpoint, and a patient-device join flow. Add contracts here before building.
Sign recognition emits the same `SelectEvent`, so it needs no new contract.
