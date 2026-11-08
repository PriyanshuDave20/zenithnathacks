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

## Speech playback (additive Azure integration)

`GET /api/speech` returns `{ provider: "azure" | "browser" }`, with no keys or
resource details. Azure is available only when explicitly selected and configured.

`POST /api/speech` accepts exactly `{ text: string, language: string }`. Text is
nonempty and at most 2,000 characters; JSON bodies are bounded at 16 KiB. The
server chooses a prebuilt voice for the supported English, Spanish, Arabic or
Mandarin locale and masks identifiers before synthesis. Successful responses are
`audio/mpeg`; failures use the existing `{ error: { code, message } }` shape:
400 invalid input, 413 oversized body, 503 disabled, or 502 provider failure.
All success/error/capability responses use `Cache-Control: no-store`.

Dynamic audio stays in memory and is released on completion, cancellation or
session/context changes. Guided questions, options and fixed phrases use public
pre-generated clips or browser voices; they do not call this synthesis endpoint.
Only the explicit public-source maintenance command may write static audio files.
Existing translate/respond request and response schemas are unchanged.

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

## Clinician accounts
Clinician-only accounts (their own profile). Never patient data. The frontend uses `src/components/auth/api.ts` to reach these routes; legacy mock accounts are never trusted or migrated. Sessions should be an httpOnly, Secure, SameSite=Lax cookie;
passwords hashed server-side using Better Auth 1.7.18’s built-in scrypt and never logged. Server-side checks must gate `/start` too (the client gate is UX only).

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
- `POST /api/auth/forgot-password` `{ email }` -> generic 204 for valid requests when delivery is configured (no account enumeration); requests a reset link. Missing delivery configuration returns generic 503.
- `POST /api/auth/signout` -> 204 (revokes and clears session).
- `POST /api/auth/reset-password` `{ token, newPassword }` -> 204; invalid/expired/used tokens fail generically. Password-reset completion is at `/reset-password`.
- `GET /api/auth/capabilities` -> `{ google: boolean, passwordReset: boolean }` (configuration availability only).
- `GET /api/me` -> `ClinicianProfile` or 401.
- `PATCH /api/me` `{ name?, role?, clinic?, languages? }` -> `ClinicianProfile`.

Errors use the shared `{ error: { code, message } }` shape. Prisma: `Clinician`, `ClinicianSession`, `ClinicianAccount` and `ClinicianVerification` only; no patient tables. Profile edits are allowlisted, ownership comes from the verified session, and plans are server-owned display metadata.

Account responses/errors are no-store. State-changing browser requests require the exact configured Origin. Google uses the library-managed OAuth state/PKCE callback. Missing auth or provider configuration returns generic 503, never a mock success. See `docs/AUTH.md` for setup and verification limits.

`POST /api/translate`, `/api/respond` and `/api/speech` require a verified clinician session and same-origin request (401 unsigned; 403 cross-origin; 503 account service unavailable). These checks run before reading patient input or contacting providers. Speech GET capabilities and anonymous `/api/metrics` remain public.

## Errors
`{ error: { code: string; message: string } }` with a normal HTTP status. Model failures return 502;
the frontend must show a typed-fallback state, never block the visit.

## Later (stretch, not in MVP)
Turn-taking conversation endpoint, and a patient-device join flow. Add contracts here before building.
Sign recognition emits the same `SelectEvent`, so it needs no new contract.
