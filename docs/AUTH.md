# Clinician accounts

The UI uses real same-origin APIs through `src/components/auth/api.ts`. It never
trusts, migrates or writes legacy mock localStorage accounts. Session state in the
UI is memory only; refresh loads `/api/me`. Authentication boundaries clear Eye,
gaze and speech state, and client gates remount patient content on account changes.
Tabs communicate only a change signal through BroadcastChannel and revalidate on
focus/visibility and every minute while visible.

Better Auth **1.7.18** owns passwords (built-in scrypt), signed httpOnly session
cookies, expiry/revocation, OAuth state and reset tokens. Prisma **7.10.1** uses the
existing PostgreSQL singleton. Tables store only clinician profiles/auth records;
`Example` remains intact. IP/user-agent fields are scrubbed, patient content is
never persisted, and anonymous metrics remain in their separate memory sink.

## Local and deployment setup

Keep secrets in the ignored `.env` / `.env.local` or deployment secret store.
Local auth secret/base URL were added only to `.env.local`; `.env` was preserved. Do not paste them
into chat or commit them. `.env.example` documents the required names.

1. Set a reachable intended direct `DATABASE_URL`. Optional `DATABASE_URL_POOLED`
   is used by the runtime singleton, falling back to `DATABASE_URL`; CLI schema
   operations keep the direct connection. Review `prisma/schema.prisma`; one
   coordinator runs `npm run db:push` after a successful read-only connection
   check. Never use reset or accept-data-loss. Run `npx prisma generate`.
2. Set `BETTER_AUTH_SECRET` to a cryptographically random secret of at least 32
   characters. Set `BETTER_AUTH_URL` to the exact trusted origin. HTTPS is required
   outside local development. An arbitrary Host header never chooses the origin.
3. Google is optional: set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register
   `<BETTER_AUTH_URL>/api/auth/callback/google` as the exact OAuth redirect URI and
   configure consent/test users in Google Cloud. Without both settings the UI
   reports unavailable; no demo Google account is fabricated.
4. Reset email is optional: set `RESEND_API_KEY` and `AUTH_EMAIL_FROM` using a
   verified sender. Without both, reset requests report unavailable and do not
   claim email was sent. Links open `/reset-password#token=...`, keeping tokens out of server request URLs; completion consumes the
   library token and revokes sessions. No real recipients are used in tests.
5. Restart the app after configuring secrets. Test with synthetic clinicians.

All account routes validate bounded input, allowlist editable profile fields and
return generic no-store errors. Password and Google accounts share the same
clinician profile shape. Billing is not connected; the plan is read-only display
metadata and cannot be elevated by a request.

## Verification and remaining setup

The configured Neon direct connection passed a read-only check. The reviewed
SQL was create-only: the existing scaffold Example plus four clinician/auth tables
on an empty database. The coordinator applied it without reset/data-loss flags.
Runtime uses the pooled connection. Real synthetic signup, password signin,
profile editing/reload and signout/revocation passed against Neon. Read-only SQL
verified the edited profile, a stored password hash, and omitted session IP/UA.
The uniquely named synthetic clinician and cascading auth records were removed.

Offline checks include actual Better Auth memory-adapter fixtures for cookie
flags, hashing, expired/revoked sessions, reset expiry/single-use/session revocation,
forged OAuth state and public-wrapper token omission. Browser checks at 390px and
1440px cover clinician flow, real server authorization, cross-tab profile edits
preserving conversations and cross-tab signout clearing patient screens. HTTP
checks confirm unsigned provider POSTs401, cross-origin403, and unexposed native
library endpoints404. Local development cookies are httpOnly/SameSite=Lax; HTTPS
fixtures verify Secure production cookies.

Prem explicitly deferred Google and reset-email activation. Neither real OAuth
consent nor email delivery has been exercised. No emails, live model/translation/
synthesis calls or audio regeneration ran. Library fixtures and mocked clinician
replies establish behavior, not language or clinical accuracy.

The auth limiter is bounded and **process-local** (global action and keyed account
windows); multiple production instances need shared abuse limiting. Accounts do
not verify clinician licensure or email ownership; email verification and account
linking are disabled for this demo. Existing Eye header controls overflow at390px;
this auth/metrics change preserves its layout and gaze/input behavior.

Official references: [Next integration](https://better-auth.com/docs/integrations/next),
[Prisma adapter](https://better-auth.com/docs/adapters/prisma),
[email/password](https://better-auth.com/docs/authentication/email-password),
[Google](https://better-auth.com/docs/authentication/google),
[Neon Prisma connections](https://neon.com/docs/guides/prisma).
