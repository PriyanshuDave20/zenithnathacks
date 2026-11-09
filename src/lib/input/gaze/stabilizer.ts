// Gaze stabilization module: one place where raw mapped gaze points become the cursor position.
// Input: raw screen-space point (viewport px), timestamp, and the caller's view of tracking quality.
// Processing: validity checks -> outlier rejection -> per-axis One-Euro filter -> dead zone.
// Output: stabilized point plus a tracking status, for rendering and diagnostics.
//
// Design notes:
// - The dead zone freezes the emitted point while the filtered position stays within `deadzonePx`
//   of it, so micro-jitter never moves the cursor, yet a slow real drift still crosses the
//   threshold and resumes movement (no permanent freeze).
// - Outlier rejection holds the pointer when one isolated frame lands impossibly far away, but a
//   position that PERSISTS for `sustainedMs` is treated as an intentional fast movement and
//   accepted, so real saccades are never permanently suppressed.
// - The per-axis One-Euro cutoffs open with velocity using the real time between frames: steady
//   looks are heavily smoothed, quick glances arrive with almost no lag.
//
// Configuration (all px/ms based, see GazeStabilizerConfig):
// - oneEuro.minCutoff: steadiness at rest (Hz). Lower = calmer, laggier.
// - oneEuro.beta: how quickly the cutoff opens with speed. Higher = snappier, jumpier.
// - oneEuro.derivativeCutoff: smoothing of the speed estimate itself.
// - deadzonePx: distance the filtered point must leave the anchor before the cursor moves.
// - maxJumpPxPerSec / maxJumpPx: velocity / distance beyond which a frame is an outlier candidate.
// - sustainedMs: how long an "impossible" position must persist before it is accepted as real.
// - lostAfterMs: without any valid input for this long the status becomes "lost".

import { OneEuroFilter, type GazePoint } from "./gaze-math";

export type StabilizerStatus = "ok" | "degraded" | "lost";

export type StabilizerOneEuroConfig = { minCutoff: number; beta: number; derivativeCutoff: number };

export type GazeStabilizerConfig = {
  oneEuro: StabilizerOneEuroConfig;
  deadzonePx: number;
  maxJumpPxPerSec: number;
  maxJumpPx: number;
  sustainedMs: number;
  lostAfterMs: number;
};

export const STABILIZER_DEFAULTS: GazeStabilizerConfig = {
  oneEuro: { minCutoff: 1.0, beta: 0.02, derivativeCutoff: 1.0 },
  deadzonePx: 6,
  maxJumpPxPerSec: 6000,
  maxJumpPx: 340,
  sustainedMs: 90,
  lostAfterMs: 600,
};

export type StabilizerResult = {
  x: number;
  y: number;
  status: StabilizerStatus;
  /** True when this frame's raw point was held back as an implausible jump. */
  outlierRejected: boolean;
};

const valid = (p: GazePoint | null | undefined): p is GazePoint =>
  !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

export class GazeStabilizer {
  private cfg: GazeStabilizerConfig;
  private euroX: OneEuroFilter;
  private euroY: OneEuroFilter;
  /** Last accepted RAW point: the outlier gate measures frame-to-frame raw jumps. */
  private lastRaw: GazePoint | null = null;
  private lastRawAt = -Infinity;
  /** Last point handed to the caller (dead-zone anchor and hold position). */
  private out: GazePoint | null = null;
  private lastValidAt = -Infinity;
  private rejectStart = -Infinity;
  private rejectedTotal = 0;

  constructor(config: Partial<GazeStabilizerConfig> = {}) {
    this.cfg = { ...STABILIZER_DEFAULTS, ...config, oneEuro: { ...STABILIZER_DEFAULTS.oneEuro, ...config.oneEuro } };
    this.euroX = new OneEuroFilter(this.cfg.oneEuro.minCutoff, this.cfg.oneEuro.beta, this.cfg.oneEuro.derivativeCutoff);
    this.euroY = new OneEuroFilter(this.cfg.oneEuro.minCutoff, this.cfg.oneEuro.beta, this.cfg.oneEuro.derivativeCutoff);
  }

  /** Live-tune parameters (diagnostics). Rebuilds the filters, so history is intentionally dropped. */
  configure(config: Partial<GazeStabilizerConfig>) {
    this.cfg = { ...this.cfg, ...config, oneEuro: { ...this.cfg.oneEuro, ...config.oneEuro } };
    this.reset();
  }

  get config() {
    return this.cfg;
  }

  get rejectedCount() {
    return this.rejectedTotal;
  }

  /** The last point that was emitted, whatever the current input (diagnostics and holds use it). */
  get lastOutput(): GazePoint | null {
    return this.out ? { ...this.out } : null;
  }

  next(raw: GazePoint | null | undefined, nowMs: number, quality: "ok" | "degraded" = "ok"): StabilizerResult {
    if (!valid(raw)) {
      return this.hold(nowMs);
    }
    // First valid frame (or a non-advancing clock): seed the filters instead of dividing by zero time.
    if (!this.lastRaw || nowMs <= this.lastRawAt) {
      this.accept(raw, nowMs);
      return this.emit(raw, "ok", false, 16);
    }

    const dtMs = nowMs - this.lastRawAt;
    const jump = Math.hypot(raw.x - this.lastRaw.x, raw.y - this.lastRaw.y);
    const velocity = jump / Math.max(dtMs / 1000, 1e-6);
    const implausible = jump > this.cfg.maxJumpPx || velocity > this.cfg.maxJumpPxPerSec;

    if (implausible && this.out) {
      if (this.rejectStart === -Infinity) this.rejectStart = nowMs;
      if (nowMs - this.rejectStart < this.cfg.sustainedMs) {
        // Isolated implausible jump: hold the pointer where it was.
        this.rejectedTotal++;
        return this.hold(nowMs, true);
      }
      // The "impossible" position persisted: it was an intentional fast movement. Accept it.
      this.rejectStart = -Infinity;
    } else if (!implausible) {
      this.rejectStart = -Infinity;
    }

    this.accept(raw, nowMs);
    return this.emit(raw, quality, false, dtMs);
  }

  reset() {
    this.euroX = new OneEuroFilter(this.cfg.oneEuro.minCutoff, this.cfg.oneEuro.beta, this.cfg.oneEuro.derivativeCutoff);
    this.euroY = new OneEuroFilter(this.cfg.oneEuro.minCutoff, this.cfg.oneEuro.beta, this.cfg.oneEuro.derivativeCutoff);
    this.lastRaw = null;
    this.lastRawAt = -Infinity;
    this.out = null;
    this.lastValidAt = -Infinity;
    this.rejectStart = -Infinity;
    this.rejectedTotal = 0;
  }

  /** No valid input: keep the last emitted point; "lost" once the timeout passes. */
  private hold(nowMs: number, outlier = false): StabilizerResult {
    if (!this.out) return { x: NaN, y: NaN, status: "lost", outlierRejected: outlier };
    if (this.lastValidAt !== -Infinity && nowMs - this.lastValidAt <= this.cfg.lostAfterMs) {
      return { x: this.out.x, y: this.out.y, status: "degraded", outlierRejected: outlier };
    }
    return { x: this.out.x, y: this.out.y, status: "lost", outlierRejected: outlier };
  }

  private accept(raw: GazePoint, nowMs: number) {
    this.lastRaw = { ...raw };
    this.lastRawAt = nowMs;
    this.lastValidAt = nowMs;
    this.rejectStart = -Infinity;
  }

  /** Filter the accepted point (real dt), then apply the dead zone against the last emitted point. */
  private emit(raw: GazePoint, status: StabilizerStatus, outlier: boolean, dtMs: number): StabilizerResult {
    // Separate filter instance per axis; each sees its own coordinate and the real frame interval.
    const fx = this.euroX.next({ x: raw.x, y: 0 }, dtMs).x;
    const fy = this.euroY.next({ x: raw.y, y: 0 }, dtMs).y;
    const filtered = { x: fx, y: fy };
    if (this.out) {
      const moved = Math.hypot(filtered.x - this.out.x, filtered.y - this.out.y);
      if (moved <= this.cfg.deadzonePx) {
        return { x: this.out.x, y: this.out.y, status, outlierRejected: outlier }; // inside the dead zone: hold
      }
    }
    this.out = filtered;
    return { x: filtered.x, y: filtered.y, status, outlierRejected: outlier };
  }
}
