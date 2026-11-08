// Pure maths for the webcam gaze input channel (used by src/components/input/gaze/gaze-layer.tsx).
// Browser only. Camera frames are processed on the device: these functions receive face landmarks
// computed locally and return plain numbers, so they are unit-testable without a camera.

export type GazePoint = { x: number; y: number };

/**
 * What the face model tells us per frame, roughly -1..1 each:
 * - x: where the irises sit horizontally (blended with head turn), the main horizontal cue.
 * - y: iris height above/below the eye-corner line; the corners do not move with gaze, the
 *   lids do, so this carries the vertical signal lid-based ratios lose.
 * - a: eye aperture (lid opening / eye width); looking down pulls the upper lid over the iris.
 * - p: head pitch proxy; lets the calibration tell "head nodded" from "eyes moved".
 * The vertical axis is fitted from y, a and p together, because none alone is strong enough.
 */
export type GazeFeatures = { x: number; y: number; a: number; p: number };

/** A point on screen, normalised 0..1 from the top-left corner. */
export type ScreenPoint = GazePoint;

// MediaPipe FaceLandmarker indices: iris centres, eye corners and lids, and a face frame.
const L_IRIS = 468;
const R_IRIS = 473;
const L_OUTER = 33;
const L_INNER = 133;
const R_INNER = 362;
const R_OUTER = 263;
const L_UPPER = 159;
const L_LOWER = 145;
const R_UPPER = 386;
const R_LOWER = 374;
const NOSE = 1;
const CHEEK_L = 234;
const CHEEK_R = 454;
const BROW = 10;
const CHIN = 152;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Returns null when no full face is present. */
export function gazeFeatures(landmarks: { x: number; y: number }[] | null | undefined): GazeFeatures | null {
  if (!landmarks || landmarks.length <= R_IRIS + 4) return null;
  const lm = landmarks;

  // Per-eye measures, written against stable references (corners, eye width) so they survive
  // the user leaning towards or away from the camera.
  const eye = (outer: { x: number; y: number }, inner: { x: number; y: number }, upper: { x: number; y: number }, lower: { x: number; y: number }, iris: { x: number; y: number }) => {
    const eyeW = Math.max(dist(outer, inner), 1e-6);
    const centre = mid(outer, inner);
    const along = (iris.x - outer.x) / (inner.x - outer.x || 1e-6);
    const lineY = outer.y + (inner.y - outer.y) * along; // corner-to-corner line at the iris
    return {
      x: (iris.x - centre.x) / eyeW,
      y: (iris.y - lineY) / eyeW,
      a: dist(upper, lower) / eyeW,
    };
  };
  const l = eye(lm[L_OUTER], lm[L_INNER], lm[L_UPPER], lm[L_LOWER], lm[L_IRIS]);
  const r = eye(lm[R_OUTER], lm[R_INNER], lm[R_UPPER], lm[R_LOWER], lm[R_IRIS]);

  const faceW = Math.max(dist(lm[CHEEK_L], lm[CHEEK_R]), 1e-6);
  const faceH = Math.max(dist(lm[BROW], lm[CHIN]), 1e-6);
  const yaw = (lm[NOSE].x - mid(lm[CHEEK_L], lm[CHEEK_R]).x) / faceW;
  const pitch = (lm[NOSE].y - mid(lm[BROW], lm[CHIN]).y) / faceH;

  return {
    x: clamp((l.x + r.x) / 2 + yaw * 0.5, -1, 1),
    y: clamp((l.y + r.y) / 2, -1, 1),
    a: (l.a + r.a) / 2,
    p: clamp(pitch, -1, 1),
  };
}

/** One calibration sample: the features seen while the user looked at a known screen point. */
export type CalibrationSample = { features: GazeFeatures; screen: ScreenPoint };

/** Horizontal: [x, 1]. Vertical: [y, a, p, 1] — the three vertical cues, weighted by calibration. */
export type GazeMapping = { x: [number, number]; y: [number, number, number, number] };

/**
 * Least-squares map from gaze features to a normalised screen point, fitted on the calibration
 * samples with a light ridge penalty (a vertical cue with little spread must not blow its
 * coefficient up). Returns null when the samples do not span the screen or the fit is wild —
 * then the caller keeps the steadier default mapping.
 */
export function fitGazeMapping(samples: CalibrationSample[]): GazeMapping | null {
  if (samples.length < 4) return null;
  // A cue that never moved during calibration cannot be fitted (the ridge would just predict
  // the mean): require the horizontal feature and at least one vertical cue to have spread.
  const spread = (pick: (s: CalibrationSample) => number) => {
    const v = samples.map(pick);
    return Math.max(...v) - Math.min(...v);
  };
  if (spread((s) => s.features.x) < 1e-6) return null;
  if (spread((s) => s.features.y) + spread((s) => s.features.a) + spread((s) => s.features.p) < 1e-6) return null;
  const cx = fitLinear(
    samples.map((s) => [s.features.x, 1]),
    samples.map((s) => s.screen.x),
    [1e-3, 0],
  );
  const cy = fitLinear(
    samples.map((s) => [s.features.y, s.features.a, s.features.p, 1]),
    samples.map((s) => s.screen.y),
    [1e-3, 1e-3, 1e-3, 0],
  );
  if (!cx || !cy) return null;
  const mapping: GazeMapping = { x: [cx[0], cx[1]], y: [cy[0], cy[1], cy[2], cy[3]] };
  for (const c of [...mapping.x, ...mapping.y]) if (Math.abs(c) > 8) return null;
  for (const s of samples) {
    const p = applyGazeMapping(mapping, s.features);
    if (Math.abs(p.x - s.screen.x) > 0.4 || Math.abs(p.y - s.screen.y) > 0.4) return null;
  }
  return mapping;
}

/** Normal equations with per-term ridge penalties; null when singular. */
function fitLinear(rows: number[][], target: number[], penalty: number[]): number[] | null {
  const n = rows[0].length;
  const ata: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const atb = new Array(n).fill(0);
  for (let i = 0; i < rows.length; i++) {
    for (let r = 0; r < n; r++) {
      atb[r] += rows[i][r] * target[i];
      for (let c = 0; c < n; c++) ata[r][c] += rows[i][r] * rows[i][c];
    }
  }
  for (let r = 0; r < n; r++) ata[r][r] += penalty[r];
  return solve(ata, atb);
}

/** Gaussian elimination with partial pivoting; null when singular. */
function solve(m: number[][], b: number[]): number[] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-9) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

/**
 * Fallback when there is no calibration. The selfie view is mirrored, so a negative feature x
 * (user looking at their right) lands on the right half of the screen; the vertical gain is
 * larger because the iris-height feature has a smaller working range.
 */
export function defaultMapping(f: GazeFeatures): ScreenPoint {
  return { x: clamp(0.5 - f.x * 0.9, 0, 1), y: clamp(0.5 + f.y * 1.2, 0, 1) };
}

export function applyGazeMapping(mapping: GazeMapping | null, f: GazeFeatures): ScreenPoint {
  if (!mapping) return defaultMapping(f);
  return {
    x: clamp(mapping.x[0] * f.x + mapping.x[1], 0, 1),
    y: clamp(mapping.y[0] * f.y + mapping.y[1] * f.a + mapping.y[2] * f.p + mapping.y[3], 0, 1),
  };
}

/** Median of a list (calibration takes the median per component over the hold window). */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid_i = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid_i] : (sorted[mid_i - 1] + sorted[mid_i]) / 2;
}

/**
 * Exponential smoother with velocity-adaptive alpha: a steady gaze stays steady (so dwell can
 * accumulate), a quick jump still arrives fast. Works in viewport pixels.
 */
export class SmoothedPoint {
  private pt: GazePoint | null = null;

  constructor(
    private minAlpha = 0.15,
    private maxAlpha = 0.6,
    private beta = 0.02,
    /** Movements smaller than this (px) are treated as jitter and ignored. */
    private deadzonePx = 0,
  ) {}

  next(p: GazePoint, dtMs: number): GazePoint {
    if (!this.pt || dtMs <= 0 || dtMs > 250) {
      this.pt = { ...p };
    } else {
      const alpha = clamp(this.minAlpha + this.beta * (Math.hypot(p.x - this.pt.x, p.y - this.pt.y) / dtMs), this.minAlpha, this.maxAlpha);
      const next = { x: this.pt.x + (p.x - this.pt.x) * alpha, y: this.pt.y + (p.y - this.pt.y) * alpha };
      if (this.deadzonePx > 0 && Math.hypot(next.x - this.pt.x, next.y - this.pt.y) < this.deadzonePx) {
        return { ...this.pt }; // sub-deadzone wobble: hold the point so the cursor never dithers
      }
      this.pt = next;
    }
    return { ...this.pt };
  }

  reset() {
    this.pt = null;
  }
}

/** Same adaptive smoothing for the raw feature vector (x, y, a, p), before the screen mapping. */
export class FeatureSmoother {
  private f: GazeFeatures | null = null;

  constructor(
    private minAlpha = 0.3,
    private maxAlpha = 0.75,
    private beta = 0.06,
  ) {}

  next(g: GazeFeatures, dtMs: number): GazeFeatures {
    if (!this.f || dtMs <= 0 || dtMs > 250) {
      this.f = { ...g };
    } else {
      const alpha = clamp(this.minAlpha + this.beta * (Math.hypot(g.x - this.f.x, g.y - this.f.y) / dtMs), this.minAlpha, this.maxAlpha);
      this.f = {
        x: this.f.x + (g.x - this.f.x) * alpha,
        y: this.f.y + (g.y - this.f.y) * alpha,
        a: this.f.a + (g.a - this.f.a) * alpha,
        p: this.f.p + (g.p - this.f.p) * alpha,
      };
    }
    return { ...this.f };
  }

  reset() {
    this.f = null;
  }
}
