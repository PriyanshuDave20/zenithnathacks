// Pure maths for the webcam gaze input channel (used by src/components/input/gaze/gaze-layer.tsx).
// Browser only. Camera frames are processed on the device: these functions receive face landmarks
// computed locally and return plain numbers, so they are unit-testable without a camera.

export type GazePoint = { x: number; y: number };

/** The two numbers the face model gives us per frame: roughly -1..1 each axis. */
export type GazeFeatures = GazePoint;

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

/**
 * "Where is the user looking", from face landmarks. The camera image is NOT mirrored, so looking
 * at something on the user's right moves the iris toward image-left (a smaller x). Head turn and
 * nod are blended in, because ICU patients move their head to aim as much as their eyes.
 * Returns null when no full face is present.
 */
export function gazeFeatures(landmarks: { x: number; y: number }[] | null | undefined): GazeFeatures | null {
  if (!landmarks || landmarks.length <= R_IRIS + 4) return null;
  const lm = landmarks;

  const eyeW = Math.max(dist(lm[L_OUTER], lm[L_INNER]), 1e-6);
  const eyeH = Math.max(dist(lm[L_UPPER], lm[L_LOWER]), 1e-6);
  const l = {
    x: (lm[L_IRIS].x - mid(lm[L_OUTER], lm[L_INNER]).x) / eyeW,
    y: (lm[L_IRIS].y - mid(lm[L_UPPER], lm[L_LOWER]).y) / eyeH,
  };
  const rEyeW = Math.max(dist(lm[R_OUTER], lm[R_INNER]), 1e-6);
  const rEyeH = Math.max(dist(lm[R_UPPER], lm[R_LOWER]), 1e-6);
  const r = {
    x: (lm[R_IRIS].x - mid(lm[R_OUTER], lm[R_INNER]).x) / rEyeW,
    y: (lm[R_IRIS].y - mid(lm[R_UPPER], lm[R_LOWER]).y) / rEyeH,
  };
  const iris = { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };

  const faceW = Math.max(dist(lm[CHEEK_L], lm[CHEEK_R]), 1e-6);
  const faceH = Math.max(dist(lm[BROW], lm[CHIN]), 1e-6);
  const yaw = (lm[NOSE].x - mid(lm[CHEEK_L], lm[CHEEK_R]).x) / faceW;
  const pitch = (lm[NOSE].y - mid(lm[BROW], lm[CHIN]).y) / faceH;

  return {
    x: clamp(iris.x + yaw * 0.8, -1, 1),
    y: clamp(iris.y + pitch * 0.8, -1, 1),
  };
}

/** One calibration sample: the features seen while the user looked at a known screen point. */
export type CalibrationSample = { features: GazeFeatures; screen: ScreenPoint };

/** Coefficients mapping [x, y, 1] -> one screen axis. */
type Axis = [number, number, number];
export type GazeMapping = { x: Axis; y: Axis };

/**
 * Least-squares affine map from gaze features to a normalised screen point, fitted on the
 * calibration samples. Returns null when the samples do not span the screen (then the caller
 * keeps the default mapping below).
 */
export function fitGazeMapping(samples: CalibrationSample[]): GazeMapping | null {
  if (samples.length < 3) return null;

  // Normal equations A^T A c = A^T b, with A rows [fx, fy, 1].
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 1],
  ];
  const bx = [0, 0, 0];
  const by = [0, 0, 0];
  for (const s of samples) {
    const row = [s.features.x, s.features.y, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) m[i][j] += row[i] * row[j];
      bx[i] += row[i] * s.screen.x;
      by[i] += row[i] * s.screen.y;
    }
  }
  m[2][2] = samples.length;

  const cx = solve3(m, bx);
  const cy = solve3(m, by);
  if (!cx || !cy) return null;
  return { x: cx, y: cy };
}

/** Solve a 3x3 system by Gaussian elimination; null when singular (features did not vary). */
function solve3(m: number[][], b: number[]): Axis | null {
  const a = m.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-9) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c <= 3; c++) a[r][c] -= f * a[col][c];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

/**
 * Fallback when there is no calibration. The selfie view is mirrored, so a negative feature x
 * (user looking at their right) lands on the right half of the screen.
 */
export function defaultMapping(f: GazeFeatures): ScreenPoint {
  return { x: clamp(0.5 - f.x * 0.9, 0, 1), y: clamp(0.5 + f.y * 0.9, 0, 1) };
}

export function applyGazeMapping(mapping: GazeMapping | null, f: GazeFeatures): ScreenPoint {
  if (!mapping) return defaultMapping(f);
  return {
    x: clamp(mapping.x[0] * f.x + mapping.x[1] * f.y + mapping.x[2], 0, 1),
    y: clamp(mapping.y[0] * f.x + mapping.y[1] * f.y + mapping.y[2], 0, 1),
  };
}

/** Median of a list (calibration samples the hold window, then takes the median per axis). */
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
  ) {}

  next(p: GazePoint, dtMs: number): GazePoint {
    if (!this.pt || dtMs <= 0 || dtMs > 250) {
      this.pt = { ...p };
    } else {
      const speed = Math.hypot(p.x - this.pt.x, p.y - this.pt.y) / dtMs; // px per ms
      const alpha = clamp(this.minAlpha + this.beta * speed, this.minAlpha, this.maxAlpha);
      this.pt = { x: this.pt.x + (p.x - this.pt.x) * alpha, y: this.pt.y + (p.y - this.pt.y) * alpha };
    }
    return { ...this.pt };
  }

  reset() {
    this.pt = null;
  }
}
