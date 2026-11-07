# Input channels lane (src/components/input)
Owned by Backend 2. Browser only. Build the body diagram (tap) first, then gaze, then the sign proof of concept.
Every channel emits `SelectEvent` from `src/lib/contracts/input.ts`. Do not edit pages, API routes, or other components.
Camera video is processed on the device only: never upload, store, or log frames. Webcam gaze is low-cost, not clinical-grade;
use large targets and dwell-to-select. Sign is a small-vocabulary proof of concept, not sign language translation.
See `docs/TEAM.md` and `docs/HANDOFF.md`.
