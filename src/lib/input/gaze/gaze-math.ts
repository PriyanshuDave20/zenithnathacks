// Pure maths for the webcam gaze input channel (used by src/components/input/gaze/gaze-layer.tsx).
// Browser only. Camera frames are processed on the device: these functions receive face landmarks
// computed locally and return plain numbers, so they are unit-testable without a camera.

export type GazePoint = { x: number; y: number };

/**
 * What the face model tells us per frame, roughly -1..1 each:
 * - x: where the irises sit horizontally relative to the eye corners, the main horizontal cue.
 * - y: iris height above/below the eye-corner line; the corners do not move with gaze, the
 *   lids do, so this carries the vertical signal lid-based ratios lose.
 * - a: eye aperture (lid opening / eye width); looking down pulls the upper lid over the iris.
 * - p: head pitch proxy; lets the calibration tell "head nodded" from "eyes moved".
 * Iris x/y drive the pointer. Aperture is optional only when held-out data shows it helps.
 * Pitch is retained for compatibility, never learned as gaze from a still-head calibration.
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
export function gazeFeatures(landmarks: { x: number; y: number }[] | null | undefined, frameAspectRatio = 1): GazeFeatures | null {
  if (!landmarks || landmarks.length <= R_IRIS + 4) return null;
  if (!Number.isFinite(frameAspectRatio) || frameAspectRatio <= 0) return null;
  // Camera x/y are normalised independently. Restore equal physical units before computing
  // lengths/angles: a tilted eye on a 16:9 frame otherwise acquires false iris displacement.
  const lm = frameAspectRatio === 1 ? landmarks : landmarks.map(p => ({ x: p.x * frameAspectRatio, y: p.y }));
  const required = [L_IRIS, R_IRIS, L_OUTER, L_INNER, R_INNER, R_OUTER, L_UPPER, L_LOWER, R_UPPER, R_LOWER, NOSE, CHEEK_L, CHEEK_R, BROW, CHIN];
  if (required.some(i => !lm[i] || !Number.isFinite(lm[i].x) || !Number.isFinite(lm[i].y))) return null;
  if (dist(lm[L_OUTER], lm[L_INNER]) < 0.005 || dist(lm[R_OUTER], lm[R_INNER]) < 0.005) return null;

  // Per-eye measures, written against stable references (corners, eye width) so they survive
  // the user leaning towards or away from the camera.
  const eye = (outer: { x: number; y: number }, inner: { x: number; y: number }, upper: { x: number; y: number }, lower: { x: number; y: number }, iris: { x: number; y: number }) => {
    const eyeW = Math.max(dist(outer, inner), 1e-6);
    const centre = mid(outer, inner);
    // Project onto the eye's own axes, so a small head roll does not look like gaze movement.
    const direction = inner.x >= outer.x ? 1 : -1;
    const ux = (inner.x - outer.x) / eyeW * direction;
    const uy = (inner.y - outer.y) / eyeW * direction;
    const dx = iris.x - centre.x, dy = iris.y - centre.y;
    return {
      x: (dx * ux + dy * uy) / eyeW,
      y: (-dx * uy + dy * ux) / eyeW,
      a: dist(upper, lower) / eyeW,
    };
  };
  const l = eye(lm[L_OUTER], lm[L_INNER], lm[L_UPPER], lm[L_LOWER], lm[L_IRIS]);
  const r = eye(lm[R_OUTER], lm[R_INNER], lm[R_UPPER], lm[R_LOWER], lm[R_IRIS]);

  // Closed eyes and blinks do not provide a trustworthy gaze sample.
  if (l.a < 0.08 || r.a < 0.08) return null;

  const faceH = Math.max(dist(lm[BROW], lm[CHIN]), 1e-6);
  const pitch = (lm[NOSE].y - mid(lm[BROW], lm[CHIN]).y) / faceH;

  return {
    x: clamp((l.x + r.x) / 2, -1, 1),
    y: clamp((l.y + r.y) / 2, -1, 1),
    a: (l.a + r.a) / 2,
    p: clamp(pitch, -1, 1),
  };
}

/** Stationary calibration targets: allow eye travel/settling before accepting any readings. */
export function calibrationFixation(elapsedMs: number, count: number, durationMs: number) {
  const slotMs = durationMs / Math.max(count, 1);
  const index = Math.min(Math.floor(Math.max(elapsedMs, 0) / slotMs), Math.max(count - 1, 0));
  const inSlot = elapsedMs - index * slotMs;
  return { index, collect: count > 0 && elapsedMs >= 0 && elapsedMs < durationMs && inSlot >= 1000 };
}

/** One calibration sample: the features seen while the user looked at a known screen point. */
export type CalibrationSample = { features: GazeFeatures; screen: ScreenPoint };

/** Horizontal: [x, 1]. Vertical: [y, a, p, y², 1]; new fits keep pitch weight zero.
 * The quadratic term is not decoration: the eyelids compress the iris-height signal (looking down
 * hides the iris), so the vertical relation bends. A straight line fitted across a bent relation
 * is exactly what makes the middle of the screen sit too high and the lower half unreachable. */
export type GazeMapping = { x: [number, number]; y: [number, number, number, number, number] };

/** Why a calibration was refused: each one maps to a different instruction for the person. */
export type GazeFitFailure = "few-samples" | "invalid" | "coverage" | "no-spread" | "too-noisy" | "degenerate";

export type GazeFit =
  | {
      mapping: GazeMapping;
      /** "good" tracks closely; "fair" works but is approximate, and the person should be told. */
      quality: "good" | "fair";
      /** Median distance between where the map says the person looked and where the dot was, held-out, as a fraction of the screen. */
      medianError: number;
    }
  | { mapping: null; reason: GazeFitFailure; medianError?: number; axisError?: ScreenPoint };

const MIN_SAMPLES = 4;
const CV_MIN_SAMPLES = 40; // below this there is too little data to hold some back
const CV_FOLDS = 4;
const RIDGE = 0.02; // relative to the data: in standardised units a coefficient of 1 means "one feature spread = one screen"
const GOOD_MEDIAN = 0.15;
const GOOD_P80 = 0.3;
const FAIR_MEDIAN = 0.21;

/** Least squares in standardised units, with a light ridge penalty; coefficients are mapped back to raw units. */
function fitStandardised(rows: number[][], target: number[]): { coef: number[]; intercept: number; z: number[] } | null {
  const n = rows.length;
  const k = rows[0].length;
  const mean = new Array(k).fill(0);
  for (const r of rows) for (let j = 0; j < k; j++) mean[j] += r[j] / n;
  const sd = new Array(k).fill(0);
  for (const r of rows) for (let j = 0; j < k; j++) sd[j] += (r[j] - mean[j]) ** 2 / n;
  for (let j = 0; j < k; j++) sd[j] = Math.sqrt(sd[j]);
  // A cue that never moved cannot be fitted: leave it out (its coefficient is 0) rather than amplify noise.
  const used = sd.map((v) => v > 1e-6);
  const cols = used.flatMap((u, j) => (u ? [j] : []));
  if (!cols.length) return null;
  const tMean = target.reduce((a, b) => a + b, 0) / n;
  const m = cols.length;
  const ata: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const atb = new Array(m).fill(0);
  for (let i = 0; i < n; i++) {
    const z = cols.map((j) => (rows[i][j] - mean[j]) / sd[j]);
    for (let a = 0; a < m; a++) {
      atb[a] += z[a] * (target[i] - tMean);
      for (let b = 0; b < m; b++) ata[a][b] += z[a] * z[b];
    }
  }
  for (let a = 0; a < m; a++) ata[a][a] += RIDGE * n;
  const w = solve(ata, atb);
  if (!w || w.some((v) => !Number.isFinite(v))) return null;
  const z = new Array(k).fill(0);
  const coef = new Array(k).fill(0);
  cols.forEach((j, idx) => {
    z[j] = w[idx];
    coef[j] = w[idx] / sd[j];
  });
  const intercept = tMean - coef.reduce((acc, c, j) => acc + c * mean[j], 0);
  return { coef, intercept, z };
}

type FitModel = { mapping: GazeMapping; z: number[] };

/** Fit both axes, then drop the worst few percent (a blink mid-sweep, a head jerk) and fit again. */
function fitRobust(samples: CalibrationSample[], aperture = false): FitModel | null {
  const build = (set: CalibrationSample[]): FitModel | null => {
    const fx = fitStandardised(set.map((s) => [s.features.x]), set.map((s) => s.screen.x));
    // Vertical: iris height plus its square (the eyelid compression bends the relation) and,
    // when held-out data justifies it, the eye opening.
    const fy = fitStandardised(
      set.map((s) => (aperture ? [s.features.y, s.features.y * s.features.y, s.features.a] : [s.features.y, s.features.y * s.features.y])),
      set.map((s) => s.screen.y),
    );
    if (!fx || !fy) return null;
    return {
      mapping: {
        x: [fx.coef[0], fx.intercept],
        // y slots: [iris lin, aperture, pitch (unused), iris quad, intercept]
        y: aperture
          ? [fy.coef[0], fy.coef[2], 0, fy.coef[1], fy.intercept]
          : [fy.coef[0], 0, 0, fy.coef[1], fy.intercept],
      },
      z: [...fx.z, ...fy.z],
    };
  };
  const first = build(samples);
  if (!first) return null;
  const errors = samples.map((s) => errorOf(first.mapping, s));
  const mid = median(errors) ?? 0;
  const cut = Math.max(mid * 2.5, 0.15);
  const keep = samples.filter((_, i) => errors[i] <= cut);
  // Never throw away more than a fifth: if that is not enough the data is simply noisy.
  if (keep.length >= samples.length * 0.8 && keep.length < samples.length && keep.length >= MIN_SAMPLES) return build(keep) ?? first;
  return first;
}

function errorOf(mapping: GazeMapping, s: CalibrationSample) {
  const p = applyGazeMapping(mapping, s.features);
  return Math.hypot(p.x - s.screen.x, p.y - s.screen.y);
}

/**
 * Map from gaze features to a normalised screen point, fitted on a calibration sweep. The decision
 * to accept it rests on held-out error (hold some of the sweep back, fit on the rest, measure on
 * what was held back), not on how well it reproduces the data it was fitted to. It refuses only when
 * the signal cannot be used, and says which kind of problem it was; a usable-but-approximate
 * calibration comes back as "fair" so the person can be told rather than sent round again.
 */
export function fitGazeCalibration(samples: CalibrationSample[]): GazeFit {
  if (samples.length < MIN_SAMPLES) return { mapping: null, reason: "few-samples" };
  if (samples.some((s) => [...Object.values(s.features), s.screen.x, s.screen.y].some((v) => !Number.isFinite(v)))) {
    return { mapping: null, reason: "invalid" };
  }
  const xs = samples.map((s) => s.screen.x);
  const ys = samples.map((s) => s.screen.y);
  if (Math.max(...xs) - Math.min(...xs) < 0.5 || Math.max(...ys) - Math.min(...ys) < 0.25) return { mapping: null, reason: "coverage" };
  const spread = (pick: (s: CalibrationSample) => number) => {
    const v = samples.map(pick);
    return Math.max(...v) - Math.min(...v);
  };
  // Eyelids and head motion cannot substitute for a missing iris signal.
  if (spread((s) => s.features.x) < 1e-6) return { mapping: null, reason: "no-spread" };
  if (spread((s) => s.features.y) < 1e-6) return { mapping: null, reason: "no-spread" };

  // Compare iris-only with iris + aperture on held-out data. Some cameras have almost no
  // usable vertical iris signal; forcing iris-only rejected every attempt on Zach's webcam.
  // Never fit pitch from a still-head calibration. Prefer iris-only unless aperture gives a
  // meaningful improvement, and keep the same refusal thresholds for both candidates.
  const evaluate = (aperture: boolean): GazeFit => {
    const model = fitRobust(samples, aperture);
    if (!model || model.z.some((v) => Math.abs(v) > 2)) return { mapping: null, reason: "degenerate" };
    const held: number[] = [];
    const axisX: number[] = [];
    const axisY: number[] = [];
    const measure = (mapping: GazeMapping, sample: CalibrationSample) => {
      const point = applyGazeMapping(mapping, sample.features);
      axisX.push(Math.abs(point.x - sample.screen.x));
      axisY.push(Math.abs(point.y - sample.screen.y));
      return errorOf(mapping, sample);
    };
    if (samples.length >= CV_MIN_SAMPLES) {
      const chunk = Math.max(5, Math.floor(samples.length / 16));
      for (let fold = 0; fold < CV_FOLDS; fold++) {
        const train = samples.filter((_, i) => Math.floor(i / chunk) % CV_FOLDS !== fold);
        const test = samples.filter((_, i) => Math.floor(i / chunk) % CV_FOLDS === fold);
        const m = train.length >= MIN_SAMPLES ? fitRobust(train, aperture) : null;
        if (!m) return { mapping: null, reason: "degenerate" };
        for (const sample of test) held.push(measure(m.mapping, sample));
      }
    }
    const errors = held.length ? held : samples.map((sample) => measure(model.mapping, sample));
    const med = median(errors) ?? 1;
    const p80 = [...errors].sort((a, b) => a - b)[Math.floor(errors.length * 0.8)] ?? 1;
    if (med > FAIR_MEDIAN) return { mapping: null, reason: "too-noisy", medianError: med, axisError: { x: median(axisX) ?? 1, y: median(axisY) ?? 1 } };
    return { mapping: model.mapping, quality: med <= GOOD_MEDIAN && p80 <= GOOD_P80 ? "good" : "fair", medianError: med };
  };
  const iris = evaluate(false);
  // Four samples suffice for the compatibility wrapper, but not to justify an extra cue.
  if (samples.length < CV_MIN_SAMPLES) return iris;
  const mixed = evaluate(true);
  if (mixed.mapping && (!iris.mapping || mixed.medianError + 0.02 < iris.medianError)) return mixed;
  if (!iris.mapping && !mixed.mapping && (mixed.medianError ?? Infinity) < (iris.medianError ?? Infinity)) return mixed;
  return iris;

}

/**
 * Space to keep clear at every screen edge, in px. A system effect can light or cover the border of the
 * whole display in the dark (macOS Tahoe's "Edge Light" draws a bright frame around it, over every app,
 * and only pulls back from the mouse pointer, not from an eye-tracking cursor), and a page cannot detect
 * it or know how wide it is. So controls and calibration targets stay this far in. Scales with the screen
 * (smaller of width and height); `wide` is for when the light has been turned up.
 */
export function edgeSafePx(width: number, height: number, wide = false): number {
  const vmin = Math.min(width, height);
  return wide ? Math.round(Math.min(180, Math.max(32, vmin * 0.14))) : Math.round(Math.min(112, Math.max(24, vmin * 0.08)));
}

/** Middle (per-component median) of a set of readings, e.g. what the eyes looked like during a steady look. */
export function medianFeatures(list: GazeFeatures[]): GazeFeatures | null {
  if (!list.length) return null;
  const m = (pick: (f: GazeFeatures) => number) => median(list.map(pick)) as number;
  return { x: m((f) => f.x), y: m((f) => f.y), a: m((f) => f.a), p: m((f) => f.p) };
}

/**
 * One-point drift correction. After a calibration the whole pointer slides to one side whenever the
 * head has shifted a little (or the device has been passed round), which wrecks selection even though
 * the map itself is still good. Given a steady reading taken while the person looked at a known point,
 * this moves the map so that reading lands exactly on that point, leaving the map's gains alone.
 */
export function recenterMapping(mapping: GazeMapping, features: GazeFeatures, target: ScreenPoint = { x: 0.5, y: 0.5 }): GazeMapping {
  // Unclamped, so a pointer that was pinned against an edge still gives the true offset.
  const rawX = mapping.x[0] * features.x + mapping.x[1];
  const rawY = mapping.y[0] * features.y + mapping.y[1] * features.a + mapping.y[2] * features.p + mapping.y[3] * features.y * features.y + mapping.y[4];
  return {
    x: [mapping.x[0], mapping.x[1] + (target.x - rawX)],
    y: [mapping.y[0], mapping.y[1], mapping.y[2], mapping.y[3], mapping.y[4] + (target.y - rawY)],
  };
}

export type GazeBox = { id: number; left: number; top: number; right: number; bottom: number };

/**
 * Which control the pointer means. Webcam tracking is only good to a fraction of a screen, so a
 * pointer that must land exactly inside a button flickers between neighbours or lands on nothing.
 * This takes the control the point is on (the smallest, if they nest), otherwise the nearest one
 * within `radius`, and keeps the previous choice unless another is clearly closer (`stickPx`), so the
 * choice does not flip while the eyes hover on a boundary.
 */
export function pickGazeTarget(
  point: { x: number; y: number },
  boxes: GazeBox[],
  opts: { radius: number; previous?: number | null; stickPx?: number },
): number | null {
  const stick = opts.stickPx ?? 28;
  const scored = boxes
    .map((b) => ({
      id: b.id,
      d: Math.hypot(Math.max(b.left - point.x, 0, point.x - b.right), Math.max(b.top - point.y, 0, point.y - b.bottom)),
      area: (b.right - b.left) * (b.bottom - b.top),
    }))
    .sort((a, b) => a.d - b.d || a.area - b.area);
  const best = scored[0];
  if (!best || best.d > opts.radius) return null;
  const prev = opts.previous == null ? undefined : scored.find((c) => c.id === opts.previous);
  if (prev && prev.d <= opts.radius * 1.35 && prev.d <= best.d + stick) return prev.id;
  return best.id;
}

/** Same fit, for callers that only want the map: null when the calibration was refused. */
export function fitGazeMapping(samples: CalibrationSample[]): GazeMapping | null {
  return fitGazeCalibration(samples).mapping;
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
    y: clamp(mapping.y[0] * f.y + mapping.y[1] * f.a + mapping.y[2] * f.p + mapping.y[3] * f.y * f.y + mapping.y[4], 0, 1),
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
/**
 * One-Euro filter (Casiez, Roussel, Vogel 2012) for a 2D pointer in viewport pixels. A low-pass filter
 * whose cutoff rises with how fast the point is moving: while the eyes rest, the cutoff is low and
 * jitter is smoothed away; when they jump, the cutoff opens up and the pointer follows without lag.
 * Unlike a fixed-step smoother it is tied to real time (the camera's frame rate varies), and its two
 * knobs mean something: `minCutoff` (Hz) is the steadiness at rest, `beta` is how fast it opens up.
 */
export class OneEuroFilter {
  private x: GazePoint | null = null;
  private dx: GazePoint = { x: 0, y: 0 };

  constructor(
    private minCutoff = 1.0,
    private beta = 0.01,
    private derivCutoff = 1.0,
  ) {}

  private static alpha(cutoffHz: number, dtSec: number) {
    const tau = 1 / (2 * Math.PI * cutoffHz);
    return 1 / (1 + tau / dtSec);
  }

  next(p: GazePoint, dtMs: number): GazePoint {
    if (!this.x || dtMs <= 0 || dtMs > 250) {
      this.x = { ...p };
      this.dx = { x: 0, y: 0 };
      return { ...p };
    }
    const dt = dtMs / 1000;
    const ad = OneEuroFilter.alpha(this.derivCutoff, dt);
    // Speed estimate (px/s), itself smoothed.
    const rawDx = { x: (p.x - this.x.x) / dt, y: (p.y - this.x.y) / dt };
    this.dx = { x: this.dx.x + (rawDx.x - this.dx.x) * ad, y: this.dx.y + (rawDx.y - this.dx.y) * ad };
    const speed = Math.hypot(this.dx.x, this.dx.y);
    const a = OneEuroFilter.alpha(this.minCutoff + this.beta * speed, dt);
    this.x = { x: this.x.x + (p.x - this.x.x) * a, y: this.x.y + (p.y - this.x.y) * a };
    return { ...this.x };
  }

  reset() {
    this.x = null;
    this.dx = { x: 0, y: 0 };
  }
}

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
/**
 * Blink guard. While a lid closes and reopens the iris reading shifts and the eye-opening cue
 * collapses, but the frame is still "valid" (the eye is not shut yet), and the vertical map leans on
 * the eye opening, so the pointer is yanked. This recognises a blink as the opening dropping well
 * below its own usual level, drops frames until it has recovered, then a short settle.
 *
 * It measures the signal's own noise (a webcam's eye-opening reading is noisy: a few percent from
 * frame to frame) and only calls a drop a blink when it is far outside that noise, so ordinary
 * jitter is never mistaken for one. "Usual" is the median of recent open-eye frames, which noise
 * cannot drag around the way a recent peak can. It tells a blink from simply looking lower (the
 * opening drops and STAYS) by whether it passes through its lowest point or settles, and a lasting
 * narrowing becomes the new usual instead of being ignored forever.
 */
export class BlinkGuard {
  private buf: number[] = []; // openings of recent frames we accepted
  private prev = 0;
  private lastY = 0; // iris height on the last accepted frame: the down-look discriminator
  private blinkStart = -1;
  private blinkRef = 0;
  private blinkSigma = 0;
  private blinkMin = 0;
  private blinkPrev = 0;
  private stableFrames = 0;
  private settleUntil = -1;

  constructor(
    private minDrop = 0.14, // at least this fraction below usual...
    private noiseK = 4, // ...and at least this many noise-widths below it
    private settleMs = 140, // keep ignoring frames this long after the lid has reopened
    private sustainedMs = 700, // longer than any blink: the eyes are simply narrower now
    private bufSize = 36, // about 1.2 s of frames
    private deepDip = 0.8, // a blink dips below this fraction of usual; looking down does not
  ) {}

  /** Usual opening (median) and the noise around it (robust spread), or null until enough is seen. */
  private stats(): { ref: number; sigma: number } | null {
    if (this.buf.length < 8) return null;
    const ref = median(this.buf) as number;
    const sigma = 1.4826 * (median(this.buf.map((v) => Math.abs(v - ref))) as number);
    return { ref, sigma };
  }

  private push(a: number) {
    this.buf.push(a);
    if (this.buf.length > this.bufSize) this.buf.shift();
  }

  private begin(ref: number, sigma: number, nowMs: number) {
    this.blinkRef = ref;
    this.blinkSigma = sigma;
    this.blinkMin = ref;
    this.blinkPrev = ref;
    this.stableFrames = 0;
    this.blinkStart = nowMs;
  }

  /** Take the opening at `a` as the new usual: re-centre what we remember, keeping its noise shape. */
  private adopt(a: number) {
    const st = this.stats();
    if (st) this.buf = this.buf.map((v) => v + (a - st.ref));
    else this.buf = [a];
    this.blinkStart = -1;
  }

  /** Looking down narrows the eye, like a blink starting. But looking down also slides the iris
   * well below the eye-corner line, which a blink never does: that difference keeps down-looks
   * from being dropped as blinks (they used to be, which pinned the cursor at the top). */
  private isLookDown(f: GazeFeatures) {
    return f.y > this.lastY + 0.1;
  }

  /** The features unchanged for an open eye, or null while a blink is closing, closed or reopening. */
  next(f: GazeFeatures | null, nowMs: number): GazeFeatures | null {
    const st = this.stats();
    if (!f) {
      // Eyes shut, or the face was lost: treat as part of a blink, and let the reopening settle.
      if (st && this.blinkStart < 0) this.begin(st.ref, st.sigma, nowMs);
      this.settleUntil = nowMs + this.settleMs;
      return null;
    }
    const a = f.a;
    const smooth = this.prev > 0 ? (a + this.prev) / 2 : a; // two frames, so one noisy reading cannot trip it
    this.prev = a;

    if (this.blinkStart >= 0) {
      if (this.isLookDown(f)) {
        // What looked like a blink is the eye narrowing while the iris slides down: keep tracking.
        this.adopt(a);
        this.push(a);
        this.lastY = f.y;
        return f;
      }
      this.blinkMin = Math.min(this.blinkMin, a);
      const deep = this.blinkMin < this.blinkRef * this.deepDip;
      this.stableFrames = Math.abs(a - this.blinkPrev) <= Math.max(this.blinkRef * 0.02, this.blinkSigma) ? this.stableFrames + 1 : 0;
      this.blinkPrev = a;
      if (smooth >= this.blinkRef - Math.max(this.blinkRef * 0.06, 2 * this.blinkSigma)) {
        this.blinkStart = -1; // recovered; the settle window below holds a little longer
        this.settleUntil = nowMs + this.settleMs;
        return null;
      }
      // A blink passes through its lowest point in a frame or two; a look-down settles and stays there.
      const settled = deep ? this.stableFrames >= 5 && a > this.blinkRef * 0.5 : this.stableFrames >= 3;
      if (settled || nowMs - this.blinkStart > this.sustainedMs) {
        this.adopt(a);
        this.push(a);
        this.lastY = f.y;
        return f;
      }
      return null;
    }

    if (st) {
      const drop = Math.max(this.minDrop * st.ref, this.noiseK * st.sigma);
      if (smooth < st.ref - drop) {
        if (this.isLookDown(f)) {
          // The eye narrowed while the iris slid well below the corner line: a downward look, not
          // a blink. Keep the frame and let the narrower opening become the new usual for the
          // next step down, so descending gaze is never eaten as a blink.
          this.adopt(a);
          this.push(a);
          this.lastY = f.y;
          return f;
        }
        this.begin(st.ref, st.sigma, nowMs);
        return null;
      }
    }
    this.push(a);
    if (nowMs < this.settleUntil) return null;
    this.lastY = f.y;
    return f;
  }

  reset() {
    this.buf = [];
    this.prev = 0;
    this.lastY = 0;
    this.blinkStart = -1;
    this.blinkRef = 0;
    this.blinkSigma = 0;
    this.blinkMin = 0;
    this.blinkPrev = 0;
    this.stableFrames = 0;
    this.settleUntil = -1;
  }
}

/**
 * Hold readings briefly so a detected blink can discard its not-yet-recognised closing frames.
 * Timestamp travels with the features: calibration must pair these with the dot at capture time.
 * Never releases a sample from before a dropped frame or a long camera gap.
 */
export class BlinkSafeBuffer {
  private pending: { features: GazeFeatures; at: number }[] = [];
  constructor(private delayMs = 100) {}

  next(features: GazeFeatures | null, at: number): { features: GazeFeatures; at: number } | null {
    if (!features || (this.pending.length && at - this.pending[this.pending.length - 1].at > 250)) this.reset();
    if (!features) return null;
    this.pending.push({ features, at });
    let ready: { features: GazeFeatures; at: number } | null = null;
    while (this.pending.length && this.pending[0].at <= at - this.delayMs) ready = this.pending.shift()!;
    return ready;
  }

  reset() { this.pending = []; }
}

/**
 * Fixation filter. A steady look is not one point: webcam tracking jitters around it, and deciding
 * from the last few frames means that jitter decides which button is chosen. During a steady look
 * this reports the middle (median) of the points since the eyes last jumped, so the noise averages
 * out and the estimate gets steadier the longer the look holds. When the eyes move to somewhere new
 * (two points in a row well away from the fixation so far) it starts over at once, so a real move is
 * not dragged back toward the old spot. Works in viewport pixels.
 */
export class FixationFilter {
  private pts: { t: number; x: number; y: number }[] = [];
  private away = 0;

  constructor(
    private windowMs = 700, // how far back a steady look is averaged
    private rampPoints = 8, // points before it trusts the average fully (until then it follows the newest point)
  ) {}

  /** `jumpPx` is how far from the current fixation counts as looking somewhere else. */
  next(p: { x: number; y: number }, nowMs: number, jumpPx: number): { x: number; y: number } {
    if (this.pts.length >= 3) {
      const c = this.centre();
      this.away = Math.hypot(p.x - c.x, p.y - c.y) > jumpPx ? this.away + 1 : 0;
      if (this.away >= 2) {
        this.pts = [];
        this.away = 0;
      }
    }
    this.pts.push({ t: nowMs, x: p.x, y: p.y });
    this.pts = this.pts.filter((q) => nowMs - q.t <= this.windowMs);
    const c = this.centre();
    const w = Math.min(1, (this.pts.length - 1) / this.rampPoints);
    return { x: p.x + (c.x - p.x) * w, y: p.y + (c.y - p.y) * w };
  }

  private centre() {
    return { x: median(this.pts.map((q) => q.x)) ?? 0, y: median(this.pts.map((q) => q.y)) ?? 0 };
  }

  reset() {
    this.pts = [];
    this.away = 0;
  }
}

/** How the person is sitting: where their face is in the camera image, how big it is, which way it points. */
export type Posture = { cx: number; cy: number; scale: number; yaw: number; pitch: number };

export function postureOf(landmarks: { x: number; y: number }[] | null | undefined): Posture | null {
  if (!landmarks || landmarks.length <= R_IRIS + 4) return null;
  const a = landmarks[L_OUTER];
  const b = landmarks[R_OUTER];
  const nose = landmarks[NOSE];
  const cl = landmarks[CHEEK_L];
  const cr = landmarks[CHEEK_R];
  const brow = landmarks[BROW];
  const chin = landmarks[CHIN];
  if (![a, b, nose, cl, cr, brow, chin].every((q) => q && Number.isFinite(q.x) && Number.isFinite(q.y))) return null;
  const scale = dist(a, b); // distance between the outer eye corners: a stand-in for how far from the camera
  if (scale < 0.02) return null;
  const faceW = Math.max(dist(cl, cr), 1e-6);
  const faceH = Math.max(dist(brow, chin), 1e-6);
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    scale,
    yaw: (nose.x - mid(cl, cr).x) / faceW,
    pitch: (nose.y - mid(brow, chin).y) / faceH,
  };
}

export type PostureVerdict = "ok" | "moved" | "turned" | "distance";

/**
 * Watches for the head moving away from where it was at calibration, which is the biggest single
 * cause of the pointer sitting to one side. The reference is the median posture over the calibration
 * sweep; a change counts only once it has lasted `sustainMs`, and a flag clears only when the person is
 * well back inside the limits (hysteresis), so the hint neither flickers nor nags.
 */
export class PostureMonitor {
  private base: Posture | null = null;
  private samples: Posture[] = [];
  private badSince = -1;
  private flagged: PostureVerdict = "ok";

  constructor(
    private shiftLimit = 0.3, // head sideways/up/down, in eye-spans (about 2.7 cm for an adult)
    private scaleLimit = 0.09, // leaned in or out by this fraction of the face size (about 5 cm at arm's length)
    private turnLimit = 0.09, // head turned or tilted (nose offset, as a fraction of the face)
    private sustainMs = 1500,
  ) {}

  /** Collect postures while the person holds still for the reference (the calibration sweep, a recenter). */
  addReference(p: Posture) {
    if (this.samples.length < 600) this.samples.push(p);
  }

  /** Fix the reference to what was collected. False if too little was seen. */
  lockReference(): boolean {
    if (this.samples.length < 10) {
      this.samples = [];
      return false;
    }
    const m = (pick: (p: Posture) => number) => median(this.samples.map(pick)) as number;
    this.base = { cx: m((p) => p.cx), cy: m((p) => p.cy), scale: m((p) => p.scale), yaw: m((p) => p.yaw), pitch: m((p) => p.pitch) };
    this.samples = [];
    this.badSince = -1;
    this.flagged = "ok";
    return true;
  }

  next(p: Posture, nowMs: number): PostureVerdict {
    const b = this.base;
    if (!b) return "ok";
    const now = this.outside(p, this.flagged === "ok" ? 1 : 0.75);
    if (now === "ok") {
      this.badSince = -1;
      this.flagged = "ok";
    } else {
      if (this.badSince < 0) this.badSince = nowMs;
      if (nowMs - this.badSince >= this.sustainMs) this.flagged = now;
    }
    return this.flagged;
  }

  /** Immediate selection guard, independent of the delayed informational hint. */
  outside(p: Posture, slack = 1): PostureVerdict {
    const b = this.base;
    if (!b) return "ok";
    const shift = Math.hypot(p.cx - b.cx, p.cy - b.cy) / b.scale;
    const lean = Math.abs(p.scale / b.scale - 1);
    const turn = Math.max(Math.abs(p.yaw - b.yaw), Math.abs(p.pitch - b.pitch));
    return lean > this.scaleLimit * slack ? "distance" : shift > this.shiftLimit * slack ? "moved" : turn > this.turnLimit * slack ? "turned" : "ok";
  }

  reset() {
    this.base = null;
    this.samples = [];
    this.badSince = -1;
    this.flagged = "ok";
  }
}

export type LightVerdict = "ok" | "changed" | "dark";

/**
 * Watches the brightness of the face (0..1). Lighting shifts the shadows around the eyes and so the
 * features the map was fitted on. Flags a change from the calibration level, or a face that is simply
 * too dark to track, once it has lasted `sustainMs`. The limits are loose on purpose: the camera adjusts
 * its own exposure, and a tighter limit would nag.
 */
export class LightMonitor {
  private base: number | null = null;
  private samples: number[] = [];
  private badSince = -1;
  private flagged: LightVerdict = "ok";

  constructor(
    private changeLimit = 0.3,
    private darkLevel = 0.16,
    private sustainMs = 3000,
  ) {}

  addReference(level: number) {
    if (Number.isFinite(level) && this.samples.length < 400) this.samples.push(level);
  }

  /** The reference level, or null if too little was seen. */
  lockReference(): number | null {
    this.base = this.samples.length >= 3 ? (median(this.samples) as number) : null;
    this.samples = [];
    this.badSince = -1;
    this.flagged = "ok";
    return this.base;
  }

  /** Median level of what was collected so far (for explaining a failed calibration). */
  referenceSoFar(): number | null {
    return this.samples.length >= 3 ? (median(this.samples) as number) : this.base;
  }

  get isDark() {
    const level = this.referenceSoFar();
    return level !== null && level < this.darkLevel;
  }

  next(level: number, nowMs: number): LightVerdict {
    if (!Number.isFinite(level)) return this.flagged;
    const slack = this.flagged === "ok" ? 1 : 0.75;
    const now: LightVerdict =
      level < this.darkLevel / slack ? "dark" : this.base !== null && Math.abs(level / this.base - 1) > this.changeLimit * slack ? "changed" : "ok";
    if (now === "ok") {
      this.badSince = -1;
      this.flagged = "ok";
    } else {
      if (this.badSince < 0) this.badSince = nowMs;
      if (nowMs - this.badSince >= this.sustainMs) this.flagged = now;
    }
    return this.flagged;
  }

  reset() {
    this.base = null;
    this.samples = [];
    this.badSince = -1;
    this.flagged = "ok";
  }
}

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
