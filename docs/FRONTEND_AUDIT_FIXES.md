# Frontend audit fixes

All 13 findings from the frontend audit are addressed on `zach/frontend-audit-fixes`.

| Finding | Change | Verification |
|---|---|---|
| Patient high contrast | Scoped utility colors and disabled controls follow the contrast palette | Chromium, 390px, 150% text; free/guided screens and diagram |
| Typed draft lost on channel switch | Channel switches merge preserved drafts instead of overwriting them | Typed → voice → typed retains text |
| Recognition error loses transcript | Error fallback displays editable captured text and supports retry | Simulated Web Speech network error |
| Voice tail dropped on finish | Wait for end/final result, with bounded fallback retaining the visible draft | Delayed final result includes the complete phrase once |
| Guided corrections reset report | Restore original option IDs, body spots and phrase selection | All five answers and keyboard-marked chest restored after read-back correction |
| Raw IDs/incorrect failure confirmation | Localized display-only input resolver and explicit untranslated handoff label | 2 unit regressions; browser simulated 502 |
| Eye mode lacks auto-clear | Shared warning/expiry hook; clear phrase and stop gaze | Browser clock: warning, keep-alive, then expiry |
| Calibration focus escapes | Native dialog with Escape cancellation and trigger-focus restoration | Camera-start stub: modal state, background focus blocked, Escape/restore |
| Header overflow at 320px | Compact wordmark below 360px | No horizontal overflow at 320px |
| Eye handoff focus | Focus new main on handoff/review/expiry | Active element is the new main |
| Workflow ignores reduced motion | Scroll track only, instant under reduced motion | Browser verifies instant option; 44px step targets |
| Reset claims email sent | Mock-specific explanation and success state | Browser confirms no-email text |
| Auth validation lacks focus/announcement | Alert summary, first-invalid focus, stale error clearing | Signin/signup keyboard focus and edited error state |

Validation: typecheck, 83 tests, full lint (0 errors; existing bundled-skill warnings), and whitespace checks. Browser checks use Chromium with emulated viewports; speech and camera startup use synthetic stubs, and inactivity uses the browser clock. No real microphone/webcam accuracy or screen-reader certification is claimed. No backend/API/storage changes.

The changes preserve the existing Synapse design system and were reviewed with impeccable, Apple Design and UI/UX Pro Max. Patient text remains in browser memory; ending or clearing the session still invalidates pending work.
