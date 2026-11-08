# Deploy Synapse to Vercel

Deployment source: GitHub repository `PriyanshuDave20/zenithnathacks`, production
branch `main`. Use a new Next.js project named Synapse in the intended Vercel
account. No static export or separate backend service is required.

## Project settings

- Framework preset: Next.js; root directory: repository root (`./`).
- Node.js: **24.x**, matching the package engine and the tested local runtime.
- Install: normal npm install/`npm ci`, including dev dependencies. Existing
  `postinstall` runs `prisma generate`; the generated client is not checked in.
- Build: `npm run build`; keep Next.js's default output directory.
- Database schema is already applied to the configured Neon database. Do **not**
  put `db:push`, a database reset or audio generation in a deployment build.
- The existing 562 public MP3s and manifest are deployed with `public/` unchanged.

## Production environment

Add these as Vercel **Production** environment variables. Read values from the
local ignored files or the team secret store; never commit or paste secret values
into chat. Vercel does not inherit a laptop's `.env` or `.env.local` automatically.

| Variable | Production value |
|---|---|
| `DATABASE_URL` | Existing intended direct Neon connection |
| `DATABASE_URL_POOLED` | Existing Neon pooled connection, preferred by runtime |
| `BETTER_AUTH_SECRET` | Fresh random secret of at least 32 characters; stable across deployments/instances |
| `BETTER_AUTH_URL` | Exact canonical HTTPS production origin, with no path, query or fragment |
| `GOOGLE_CLIENT_ID` | OAuth client configured for this production callback |
| `GOOGLE_CLIENT_SECRET` | Matching server-only OAuth secret |
| `LLM_PROVIDER` | `nvidia` for live processing, `mock` for offline fixtures |
| `LLM_MODEL` | Same chosen NVIDIA model as local configuration |
| `NVIDIA_API_KEY` | Existing key when NVIDIA is enabled |
| `TRANSLATION_PROVIDER` | `azure` for live text translation, `mock` for fixtures |
| `AZURE_TRANSLATOR_KEY` | Existing Translator key when enabled |
| `AZURE_TRANSLATOR_REGION` | Translator resource's actual region (`global` if applicable) |
| `SPEECH_PROVIDER` | `azure` for dynamic Azure speech, `browser` otherwise |
| `AZURE_SPEECH_KEY` | Existing Speech resource key when enabled |
| `AZURE_SPEECH_REGION` | Speech resource's actual region |

No secret uses a `NEXT_PUBLIC_` prefix. Keep local environment files unchanged.
Optional `RESEND_API_KEY` and `AUTH_EMAIL_FROM` enable password reset delivery only
once a verified sender is configured. Otherwise the app reports it unavailable.

Determine the canonical Vercel project domain before setting `BETTER_AUTH_URL`.
Use that exact domain for testing; temporary deployment URLs and localhost are
separate origins. Updating Vercel variables requires a new deployment to apply.

## Google OAuth

In Google Auth Platform, open the OAuth client and add the production callback:

```text
https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/google
```

Keep the localhost callback for local development. Add the production origin to
Authorized JavaScript origins if that field is configured. Continue using the
existing External/Testing setup and test users for the team demo, or complete the
appropriate Google publication setup for broader access. Prem confirmed the local
Google flow works; production OAuth still needs its exact registered callback.

## Preview environments

Configure preview credentials independently, using a separate development database
and a registered stable callback when authenticated previews are needed. Do not
blindly apply production database/secret settings to every preview. A build can
succeed without provider credentials; an authenticated workflow still needs valid
runtime configuration and an exact trusted origin.

## Verification and limits

After deployment, check the HTTPS landing/signin pages, email/password signup,
Google callback, own profile editing/reload, deliberate new session, guided flow,
existing audio, signout/revocation and protected-page redirects using synthetic
data. Test a phone-sized viewport. Do not put real patient data in the demo.

Anonymous metrics and auth rate limits are per process and can reset on Vercel
cold starts/redeployments; metrics are not durable cross-instance totals. Shared
abuse limiting remains a separate requirement before broader production use.
Camera video stays on-device; no patient/session tables or runtime content caches
are added by deployment.

## Sources

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Prisma 7 deployment](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/serverless/deploy-to-vercel)
- [Google provider callback](https://better-auth.com/docs/authentication/google)
