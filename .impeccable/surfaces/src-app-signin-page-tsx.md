---
version: 1
slug: "src-app-signin-page-tsx"
primary_target: "src/app/signin/page.tsx"
related_targets: ["src/app/signup/page.tsx","src/app/forgot-password/page.tsx","src/app/profile/page.tsx"]
---

# Clinician sign-in (/signin, /signup, /forgot-password) and profile (/profile)

Mode: Operate. Users: clinicians (doctors, nurses) on their own phone, tablet, or laptop, often between patients. Task: get signed in fast and get to /start. Pinned by the team (Zach, 2026-11-07): Synapse is a paid clinician app; email + password plus Continue with Google; forgot password; profile holds name, role, clinic, languages, plan (read-only); sign-in required before /start, landing stays public. Never patient data. Runs on a mock until Backend 1's routes land. Fluid on every platform.

## Direction contract

THESIS: A calm front door to a clinical tool: one short form, no friction, and a promise that the account is about the clinician, never the patient. Refuses the marketing-signup template with upsells and social proof.

OWN-WORLD: DESIGN.md as built: navy brand panel (desktop) with the extruded Synapse mark, clinic-white form surface, full-pill controls, 56px fields with visible labels, Signal Blue primary, white Google button, ground-2 notices, navy plan card on the profile, initials avatar on navy.

STORY: A clinician lands, taps Start a session, signs in with Google or email in one step, and lands in /start; new clinicians create an account, then see their profile with a welcome note and can start a session.

FIRST VIEWPORT: Sign in. Desktop: navy panel left (mark, 3D S, "Every patient, understood.", privacy line), form right. Phone: compact navy bar, then heading, Continue with Google, "or with email" divider, email, password with Show, Forgot password, full-width Sign in, Create an account link.

FORM: Pinned brief: flows and fields decided by the team, so no concept-seed roll ran; position 1 of 1; seed: none (pinned brief, no roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
