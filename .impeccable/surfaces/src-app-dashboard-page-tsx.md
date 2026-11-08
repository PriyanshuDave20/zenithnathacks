---
version: 1
slug: "src-app-dashboard-page-tsx"
primary_target: "src/app/dashboard/page.tsx"
related_targets:
  - "src/components/dashboard/clinician-dashboard.tsx"
---

# Clinician home

Mode: Operate. Code-led extension of Synapse's established visual system.

PURPOSE: A signed-in clinician can choose to start a new session, manage their own profile, or leave; login never implies that a patient session has started.

WORLD: Preserve navy #101e34, light blue #77a0c4, white #ffffff, cool mist #eef3f8, action blue #2d5f8b, Figtree headings and Noto Sans UI. Lit clinic use calls for a light workspace, a stable navy navigation bar and one dominant navy session panel.

FIRST VIEWPORT: Compact Home/Profile/Sign out navigation. Personal greeting. Primary new-session panel beside a smaller real-profile summary on desktop; stacked in that order at 390px. Primary Start new session links to /start; profile links to /profile. No patient records, counters, fake metrics or invented appointments. Privacy reminder separates the task region from quiet noninteractive future-feature slots.

INTERACTION: Immediate existing press feedback; native navigation links, one primary action, aria-current Home, visible focus, skip link, async sign-out pending/error state. No page-load choreography or timers. All motion follows existing reduced-motion rules.

SCOPE: Explicit dashboard request with fixed capabilities, inherited layout primitives; no new visual world or comp required. Unnamed future slots remain unavailable and noninteractive. Login defaults to /dashboard, deliberate protected deep links preserve next destination. Root and Home links resolve to dashboard for signed-in clinicians. Existing mock clinician account only; no patient persistence.

QUALITY: Clear task hierarchy in seconds, all navigation >=44px, no mobile overflow, long clinician details wrap, future slots do not look actionable. Profile/start/sign-out and signed-in/out navigation must work end to end.
