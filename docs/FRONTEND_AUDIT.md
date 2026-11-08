# Frontend audit follow-up — 2026-11-08

Scope: Zach narrowed the repair pass to a few bugs and explicitly deferred contrast mode. This is a scoped Impeccable audit/harden/polish follow-up, not completion of the original 20-finding backlog.

## Repaired and verified

| Original finding | Change | Evidence |
|---|---|---|
| F01 / P1: Eye content survives account boundaries | The frontend auth adapter clears Eye answers, intake, choices and speech on sign-out and successful sign-in/sign-up; gaze is stopped too. | Chromium: select Water, navigate to dashboard, sign out and sign in back to `/icu` without reloading the document. The mode picker returns, status is empty, old text is absent. |
| F02 / P1: clinician controls eligible for gaze | The entire Eye header and guidance subtree carry `data-gaze-ignore`. The patient's separate stop control remains available. | DOM check: all header/guidance controls are excluded, patient Yes remains eligible. Real-camera activation was not exercised. |
| F07 / P1: misleading speech success | A selection is labelled Selected; browser speech events drive queued, speaking, completed and failure feedback. Muted and unsupported speech do not claim playback. Clinician history is labelled Patient choices. | Browser speech stubs cover completion, muted Help, throwing playback and unavailable speech. Unit regressions cover superseded callbacks. |
| F10 / P2: Cancel Help leaves current speech running | Leaving Help cancels the current utterance; effect cleanup also clears the repeat timer and stops speech on unmount. Late cancelled callbacks are ignored. | Browser: cancellation count increases and status becomes stopped. Unit regression: late completion cannot restore success or cleared content. |

## Audit and polish verdict

The incumbent visual system is preserved. The changed speech feedback wraps legibly at 390px and 1280px; screenshots are in `.impeccable/review/frontend-repairs/`. No new animation, color, typography token, dependency or patient persistence was introduced. React review: hooks remain unconditional, Help effect has symmetric cleanup, and speech generation guards suppress stale updates after cancellation/clear.

| Dimension | Score | Remaining limitation |
|---|---:|---|
| Accessibility | 2/4 | Earlier modal, keyboard and calibration-layout findings deferred |
| Performance | 3/4 | Earlier camera-import opportunity deferred |
| Theming | 2/4 | Contrast mode explicitly excluded from repairs |
| Responsive | 2/4 | Earlier phone clipping and enlarged-text findings deferred |
| Implementation integrity | 2/4 | Four findings resolved, several other interaction issues still pending |
| Total | 11/20 | Conservative original rubric band retained; this is not a new exhaustive audit |

The manual detector pass reported seven advisories in existing Help styling/clinician typography. These literal colors and sizes were unchanged by this patch. A later automatic hook found no deterministic issues in the edited workspace; neither result certifies the whole page. Existing DESIGN.md/sidecar drift was reported and left outside this focused repair.

Remaining backlog: F03–F06, F08–F09, F11–F20: six P1, nine P2 and one P3. This includes the known phone label clipping visible in the retained screenshots. No contrast styling was changed. Resume with `$impeccable harden` for modal/keyboard issues, `$impeccable adapt` for layouts, then `$impeccable audit` and `$impeccable polish` when that work is authorized.

Validation uses synthetic content in local Chromium and stubbed speech; no actual audio quality, head movement/blinking accuracy, Safari, physical touch or real camera was validated. The initial browser navigation check hit an incomplete test speech stub (missing event methods); after correcting the stub, the same-document flow passed without an application error.

Final checks after the requested metrics pull: all **181 tests**, typecheck, lint (0 errors / 188 existing bundled-skill warnings) and whitespace checks pass. No production build was run for this focused pass.
