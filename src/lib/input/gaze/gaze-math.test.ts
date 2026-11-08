import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyGazeMapping,
  BlinkGuard,
  BlinkSafeBuffer,
  defaultMapping,
  FeatureSmoother,
  fitGazeCalibration,
  fitGazeMapping,
  gazeFeatures,
  edgeSafePx,
  median,
  LightMonitor,
  OneEuroFilter,
  PostureMonitor,
  postureOf,
  medianFeatures,
  pickGazeTarget,
  recenterMapping,
  FixationFilter,
  SmoothedPoint,
} from "./gaze-math";

/** A minimal 478-landmark face: everything at the origin except the pieces gazeFeatures reads. */
function face(overrides: Record<number, { x: number; y: number }>) {
  const lm: { x: number; y: number; z: number; visibility: number }[] = Array.from({ length: 478 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
  }));
  // A centred face frame: cheeks at x 0.3 / 0.7, brow y 0.2, chin y 0.8, nose in the middle.
  const at = (i: number, x: number, y: number) => (lm[i] = { x, y, z: 0, visibility: 1 });
  at(234, 0.3, 0.5);
  at(454, 0.7, 0.5);
  at(10, 0.5, 0.2);
  at(152, 0.5, 0.8);
  at(1, 0.5, 0.5);
  // Left eye: corners x 0.42..0.48 at y 0.46, lids y 0.44..0.48, iris on the corner line.
  at(33, 0.42, 0.46);
  at(133, 0.48, 0.46);
  at(159, 0.45, 0.44);
  at(145, 0.45, 0.48);
  at(468, 0.45, 0.46);
  // Right eye: corners x 0.52..0.58, same lids and iris.
  at(362, 0.52, 0.46);
  at(263, 0.58, 0.46);
  at(386, 0.55, 0.44);
  at(374, 0.55, 0.48);
  at(473, 0.55, 0.46);
  for (const [i, p] of Object.entries(overrides)) lm[Number(i)] = { x: p.x, y: p.y, z: 0, visibility: 1 };
  return lm;
}

test("gazeFeatures: centred eyes read as centre screen; null without a full face", () => {
  const f = gazeFeatures(face({}));
  assert.ok(f);
  assert.ok(Math.abs(f.x) < 0.05, `x ${f.x}`);
  assert.ok(Math.abs(f.y) < 0.05, `y ${f.y}`);
  assert.ok(Math.abs(f.a - 0.04 / 0.06) < 0.01, `aperture ${f.a}`); // lids 0.04 apart, eye 0.06 wide
  assert.ok(Math.abs(f.p) < 0.05, `pitch ${f.p}`);
  const point = defaultMapping(f);
  assert.ok(Math.abs(point.x - 0.5) < 0.05 && Math.abs(point.y - 0.5) < 0.05);
  assert.equal(gazeFeatures(null), null);
  assert.equal(gazeFeatures(face({}).slice(0, 400)), null);
});

test("gazeFeatures: looking to the user's right (image-left iris) points at the right of the screen", () => {
  // The camera image is unmirrored: the user's right appears on image-left.
  const f = gazeFeatures(
    face({
      468: { x: 0.41, y: 0.46 }, // left-eye iris toward image-left
      473: { x: 0.51, y: 0.46 }, // right-eye iris toward image-left
      1: { x: 0.44, y: 0.5 }, // head turned the same way
    }),
  );
  assert.ok(f);
  assert.ok(f.x < -0.1, `expected negative feature x, got ${f.x}`);
  const point = defaultMapping(f);
  assert.ok(point.x > 0.55, `expected screen right, got ${point.x}`);
});

test("gazeFeatures: looking up raises the iris above the corner line and the cursor goes up", () => {
  const f = gazeFeatures(
    face({
      468: { x: 0.45, y: 0.43 }, // left iris above the corner line (y 0.46)
      473: { x: 0.55, y: 0.43 },
      159: { x: 0.45, y: 0.41 }, // upper lid rides up with it
      386: { x: 0.55, y: 0.41 },
    }),
  );
  assert.ok(f);
  assert.ok(f.y < -0.1, `expected negative iris height, got ${f.y}`);
  const point = defaultMapping(f);
  assert.ok(point.y < 0.35, `expected screen up, got ${point.y}`);
});

test("fitGazeMapping recovers an iris map; degenerate samples are rejected", () => {
  // Iris motion determines the target; eyelid and pitch correlations must not become gaze gains.
  const features = [
    { x: 0, y: 0.05, a: 0.33, p: 0 },
    { x: -0.35, y: -0.15, a: 0.45, p: -0.2 },
    { x: 0, y: -0.15, a: 0.45, p: -0.2 },
    { x: 0.35, y: -0.15, a: 0.45, p: -0.2 },
    { x: 0.35, y: 0.05, a: 0.33, p: 0 },
    { x: 0.35, y: 0.3, a: 0.25, p: 0.2 },
    { x: 0, y: 0.3, a: 0.25, p: 0.2 },
    { x: -0.35, y: 0.3, a: 0.25, p: 0.2 },
    { x: -0.35, y: 0.05, a: 0.33, p: 0 },
  ];
  const samples = features.map((f) => ({
    features: f,
    screen: { x: f.x + 0.5, y: 0.9 * f.y + 0.5 },
  }));
  const fitted = fitGazeMapping(samples);
  assert.ok(fitted, "expected a fit");
  for (const s of samples) {
    const p = applyGazeMapping(fitted, s.features);
    assert.ok(Math.abs(p.x - s.screen.x) < 0.02 && Math.abs(p.y - s.screen.y) < 0.02, `${p.x},${p.y} vs ${s.screen.x},${s.screen.y}`);
  }
  assert.equal(fitGazeMapping(samples.slice(0, 3)), null);
  assert.equal(fitGazeMapping([]), null);
  // All-identical features cannot be fitted.
  const stuck = samples.map((s) => ({ ...s, features: { x: 0.1, y: 0.05, a: 0.33, p: 0 } }));
  assert.equal(fitGazeMapping(stuck), null);
});

test("median and the smoothers behave", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);

  const s = new SmoothedPoint(0.2, 0.2, 0); // fixed alpha for a deterministic test
  assert.equal(s.next({ x: 0, y: 0 }, 16).x, 0);
  assert.equal(s.next({ x: 100, y: 50 }, 16).x, 20); // 0 + (100-0) * 0.2
  s.reset();
  assert.deepEqual(s.next({ x: 5, y: 6 }, 16), { x: 5, y: 6 });

  const fz = new FeatureSmoother(0.5, 0.5, 0);
  fz.next({ x: 0, y: 0, a: 0.3, p: 0 }, 16);
  const moved = fz.next({ x: 0.2, y: -0.1, a: 0.5, p: 0.1 }, 16);
  assert.ok(Math.abs(moved.x - 0.1) < 1e-9 && Math.abs(moved.y + 0.05) < 1e-9);
  assert.ok(Math.abs(moved.a - 0.4) < 1e-9 && Math.abs(moved.p - 0.05) < 1e-9);
  fz.reset();
  assert.deepEqual(fz.next({ x: 1, y: 2, a: 0.3, p: 0 }, 16), { x: 1, y: 2, a: 0.3, p: 0 });
});


test("gaze rejects blinks, collapsed eyes, and non-finite landmarks", () => {
  assert.equal(gazeFeatures(face({159: {x: 0.45, y: 0.46}, 145: {x: 0.45, y: 0.46}})), null);
  assert.equal(gazeFeatures(face({133: {x: 0.42, y: 0.46}})), null);
  assert.equal(gazeFeatures(face({468: {x: NaN, y: 0.46}})), null);
});

test("iris displacement is invariant under eye roll", () => {
  const original = face({468: {x: 0.46, y: 0.47}, 473: {x: 0.56, y: 0.47}});
  const angle = 0.25;
  const rolled = original.map(p => ({...p, x: 0.5 + (p.x - 0.5) * Math.cos(angle) - (p.y - 0.5) * Math.sin(angle), y: 0.5 + (p.x - 0.5) * Math.sin(angle) + (p.y - 0.5) * Math.cos(angle)}));
  const a = gazeFeatures(original)!;
  const b = gazeFeatures(rolled)!;
  assert.ok(Math.abs(a.y - b.y) < 1e-8);
  assert.ok(Math.abs(a.a - b.a) < 1e-8);
});

test("calibration rejects non-finite input and incomplete screen coverage", () => {
  const samples = Array.from({length: 9}, (_, i) => ({features: {x: i / 10, y: i / 10, a: 0.3, p: 0}, screen: {x: 0.4 + i / 100, y: 0.4 + i / 100}}));
  assert.equal(fitGazeMapping(samples), null);
  samples[0].features.x = Infinity;
  assert.equal(fitGazeMapping(samples), null);
});

/** Deterministic pseudo-random numbers so the simulated sweeps are repeatable. */
function rng(seed: number) {
  let state = seed >>> 0;
  const uniform = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(uniform() + 1e-12)) * Math.cos(2 * Math.PI * uniform());
  return { uniform, gauss };
}

/**
 * A simulated 30 s pursuit sweep. The iris barely moves vertically inside the eye (the eyelids limit
 * it), so reaching a full screen height needs a large raw coefficient: the case the old fixed
 * "coefficient above 8" rule refused even when the data was good.
 */
function sweep(seed: number, o: { kx: number; ky: number; ka: number; noise: number; outliers: number }) {
  const { uniform, gauss } = rng(seed);
  const way = [[.5,.5],[.1,.1],[.9,.1],[.9,.9],[.1,.9],[.1,.5],[.9,.5],[.5,.1],[.5,.9],[.3,.3],[.7,.3],[.7,.7],[.3,.7],[.5,.5]];
  const out: { features: { x: number; y: number; a: number; p: number }; screen: { x: number; y: number } }[] = [];
  let drift = 0;
  for (let f = 0; f < 1800; f++) {
    const t = (f / 1800) * (way.length - 1);
    const i = Math.min(Math.floor(t), way.length - 2);
    const u = t - i;
    if (Math.sin(Math.PI * u) > 0.6) continue; // recorded only while the dot is slow
    const e = (1 - Math.cos(Math.PI * u)) / 2;
    const sx = way[i][0] + (way[i + 1][0] - way[i][0]) * e;
    const sy = way[i][1] + (way[i + 1][1] - way[i][1]) * e;
    drift += gauss() * 0.0006;
    let fx = -o.kx * (sx - 0.5) + drift + gauss() * o.noise;
    let fy = o.ky * (sy - 0.5) + gauss() * o.noise * 0.7;
    if (uniform() < o.outliers) {
      fx += gauss() * 0.15;
      fy += gauss() * 0.08;
    }
    out.push({ features: { x: fx, y: fy, a: 0.26 + o.ka * (sy - 0.5) + gauss() * o.noise * 0.4, p: 0 }, screen: { x: sx, y: sy } });
  }
  return out;
}

/** The refusal reason, or "accepted". */
const outcome = (fit: ReturnType<typeof fitGazeCalibration>) => (fit.mapping ? "accepted" : fit.reason);

function medianError(mapping: NonNullable<ReturnType<typeof fitGazeMapping>>, samples: ReturnType<typeof sweep>) {
  const errors = samples.map((s) => {
    const p = applyGazeMapping(mapping, s.features);
    return Math.hypot(p.x - s.screen.x, p.y - s.screen.y);
  });
  return median(errors)!;
}

test("calibration accepts a realistic webcam sweep and the map is accurate on fresh data", () => {
  for (const o of [
    { kx: 0.25, ky: 0.09, ka: 0.06, noise: 0.008, outliers: 0.02 }, // good light
    { kx: 0.25, ky: 0.09, ka: 0.06, noise: 0.015, outliers: 0.04 }, // typical webcam
    { kx: 0.2, ky: 0.05, ka: 0.04, noise: 0.012, outliers: 0.03 }, // small vertical iris travel
  ]) {
    for (let seed = 1; seed <= 5; seed++) {
      const fit = fitGazeCalibration(sweep(seed, o));
      assert.ok(fit.mapping, `refused a usable sweep (seed ${seed}): ${JSON.stringify(fit)}`);
      // With very weak iris travel, removing the eyelid shortcut costs some stationary
      // accuracy (measured worst seed: 16.9%). Do not disguise that as a good <15% fit.
      const error = medianError(fit.mapping, sweep(seed + 100, o));
      assert.ok(error < (o.ky < 0.06 ? 0.18 : 0.16), `fresh-sweep error ${error}`);
    }
  }
});

test("calibration still refuses data that carries no gaze signal, and says why", () => {
  // The eyes did not follow the dot at all: features unrelated to where the dot was.
  const noise = sweep(7, { kx: 0, ky: 0, ka: 0, noise: 0.04, outliers: 0.05 });
  assert.equal(outcome(fitGazeCalibration(noise)), "too-noisy");
  // A frozen signal (no face, stuck camera).
  assert.equal(outcome(fitGazeCalibration(sweep(8, { kx: 0, ky: 0, ka: 0, noise: 0, outliers: 0 }))), "no-spread");
  // Too few moments of a face.
  assert.equal(outcome(fitGazeCalibration(sweep(9, { kx: 0.25, ky: 0.09, ka: 0.06, noise: 0.01, outliers: 0 }).slice(0, 3))), "few-samples");
});

test("a very unsteady sweep is refused with a clear reason, not accepted as accurate", () => {
  assert.equal(outcome(fitGazeCalibration(sweep(11, { kx: 0.25, ky: 0.09, ka: 0.06, noise: 0.05, outliers: 0.15 }))), "too-noisy");
});

/**
 * A blink as the tracker sees it at ~30 fps: the eye opening collapses and the iris reading is pushed
 * down by the closing lid, before the eye is shut enough for the old frame filter to drop it.
 */
function blinkFrames() {
  const open = { x: 0.1, y: 0.0, a: 0.26, p: 0 };
  const dip = [0.24, 0.19, 0.13, 0.1, 0.12, 0.18, 0.23, 0.26];
  const frames = [] as { f: typeof open; t: number }[];
  let t = 0;
  for (let i = 0; i < 12; i++, t += 33) frames.push({ f: open, t });
  for (const a of dip) {
    frames.push({ f: { x: 0.1, y: 0.04 * (1 - (a - 0.1) / 0.16) + 0.0, a, p: 0 }, t });
    t += 33;
  }
  for (let i = 0; i < 12; i++, t += 33) frames.push({ f: open, t });
  return frames;
}

test("BlinkGuard keeps the pointer still through a blink and passes open-eye frames untouched", () => {
  // Gaze at the middle of the screen: this map puts the open-eye features at (0.5, 0.5).
  const map = { x: [-4, 0.9] as [number, number], y: [2.5, 4, 0, -0.54] as [number, number, number, number] };
  const run = (guarded: boolean) => {
    const guard = new BlinkGuard();
    const smoother = new FeatureSmoother(0.3, 0.735, 0.06);
    let last = { x: 0.5, y: 0.5 };
    let worst = 0;
    let passed = 0;
    for (const { f, t } of blinkFrames()) {
      const fed = guarded ? guard.next(f, t) : f;
      if (fed) {
        passed++;
        last = applyGazeMapping(map, smoother.next(fed, 33));
      }
      worst = Math.max(worst, Math.hypot(last.x - 0.5, last.y - 0.5));
    }
    return { worst, passed };
  };
  const without = run(false);
  const withGuard = run(true);
  assert.ok(without.worst > 0.3, `the blink should throw an unguarded pointer off (${without.worst.toFixed(2)})`);
  assert.ok(withGuard.worst < 0.05, `the guarded pointer should stay put through a blink (${withGuard.worst.toFixed(3)})`);
  assert.ok(withGuard.passed < without.passed, "blink frames are dropped");

  // Plain open-eye frames pass through unchanged.
  const guard = new BlinkGuard();
  const open = { x: 0.1, y: 0, a: 0.26, p: 0 };
  for (let i = 0; i < 20; i++) assert.deepEqual(guard.next(open, i * 33), open);
});

test("BlinkGuard learns a narrower normal instead of ignoring the eyes forever", () => {
  const guard = new BlinkGuard();
  const wide = { x: 0, y: 0, a: 0.26, p: 0 };
  for (let i = 0; i < 20; i++) guard.next(wide, i * 33);
  // Looking down narrows the eyes and they stay narrow: the first frames look like a blink, then it is accepted.
  const narrow = { x: 0, y: 0.03, a: 0.15, p: 0 };
  let accepted = -1;
  for (let i = 0; i < 60; i++) {
    if (guard.next(narrow, 700 + i * 33) && accepted < 0) accepted = i;
  }
  assert.ok(accepted > 0, "a blink is ignored at first");
  assert.ok(accepted < 50, "but a lasting narrowing is adopted within about a second and a half");
  assert.ok(guard.next(narrow, 5000), "and keeps being accepted");
});

test("BlinkGuard does not freeze the pointer when the person simply looks lower", () => {
  // Looking from the top to the bottom of the screen narrows the eyes ~20% and they stay that way.
  for (const glanceFrames of [3, 6, 12]) {
    const guard = new BlinkGuard();
    let t = 0;
    for (let i = 0; i < 12; i++) guard.next({ x: 0, y: -0.04, a: 0.29, p: 0 }, t++ * 33);
    let ignored = 0;
    for (let i = 1; i <= glanceFrames; i++) {
      const k = i / glanceFrames;
      if (!guard.next({ x: 0, y: -0.04 + 0.08 * k, a: 0.29 - 0.06 * k, p: 0 }, t++ * 33)) ignored++;
    }
    for (let i = 0; i < 12; i++) if (!guard.next({ x: 0, y: 0.04, a: 0.23, p: 0 }, t++ * 33)) ignored++;
    assert.ok(ignored <= 9, `a ${glanceFrames}-frame glance should resume within about 0.3 s, ignored ${ignored} frames`);
    assert.ok(guard.next({ x: 0, y: 0.04, a: 0.23, p: 0 }, t * 33), "and tracking continues afterwards");
  }
  // Steady looking with ordinary sensor noise never loses a frame.
  const steady = new BlinkGuard();
  let dropped = 0;
  for (let i = 0; i < 600; i++) if (!steady.next({ x: 0, y: 0, a: 0.26 + Math.sin(i * 12.9898) * 0.003, p: 0 }, i * 33)) dropped++;
  assert.equal(dropped, 0);
});

test("recenterMapping removes a steady offset and keeps the map's gains", () => {
  const map = { x: [-4, 0.9] as [number, number], y: [2.5, 4, 0, -0.54] as [number, number, number, number] };
  const centreLook = { x: 0.1, y: 0, a: 0.26, p: 0 }; // this map puts it at (0.5, 0.5)
  assert.deepEqual(applyGazeMapping(map, centreLook), { x: 0.5, y: 0.5 });
  // The head has shifted since calibration: looking at the centre now reads differently.
  const shifted = { x: 0.1 + 0.03, y: 0.01, a: 0.25, p: 0 };
  const off = applyGazeMapping(map, shifted);
  assert.ok(Math.hypot(off.x - 0.5, off.y - 0.5) > 0.1, "the shift moves the pointer well off the centre");
  const fixed = recenterMapping(map, shifted);
  const back = applyGazeMapping(fixed, shifted);
  assert.ok(Math.abs(back.x - 0.5) < 1e-9 && Math.abs(back.y - 0.5) < 1e-9, "the shifted reading now lands on the centre");
  assert.deepEqual([fixed.x[0], fixed.y[0], fixed.y[1], fixed.y[2]], [map.x[0], map.y[0], map.y[1], map.y[2]], "gains are unchanged");
  // Looking elsewhere moves the pointer by the same amount as before, just from the corrected origin.
  const lookA = { x: 0.05, y: 0.02, a: 0.27, p: 0 };
  const lookB = { x: 0.15, y: -0.02, a: 0.25, p: 0 };
  const moveBefore = { x: applyGazeMapping(map, lookB).x - applyGazeMapping(map, lookA).x, y: applyGazeMapping(map, lookB).y - applyGazeMapping(map, lookA).y };
  const moveAfter = { x: applyGazeMapping(fixed, lookB).x - applyGazeMapping(fixed, lookA).x, y: applyGazeMapping(fixed, lookB).y - applyGazeMapping(fixed, lookA).y };
  assert.ok(Math.abs(moveBefore.x - moveAfter.x) < 1e-9 && Math.abs(moveBefore.y - moveAfter.y) < 1e-9);
  // An offset big enough to pin the pointer on an edge is still measured correctly (no clamping).
  const far = recenterMapping(map, { x: -0.5, y: 0.4, a: 0.26, p: 0 });
  const landed = applyGazeMapping(far, { x: -0.5, y: 0.4, a: 0.26, p: 0 });
  assert.ok(Math.abs(landed.x - 0.5) < 1e-9 && Math.abs(landed.y - 0.5) < 1e-9);
  assert.equal(medianFeatures([]), null);
  assert.deepEqual(medianFeatures([{ x: 3, y: 0, a: 1, p: 0 }, { x: 1, y: 0, a: 3, p: 0 }, { x: 2, y: 0, a: 2, p: 0 }]), { x: 2, y: 0, a: 2, p: 0 });
});

test("pickGazeTarget takes the control under the point, else the nearest, and does not flip on a boundary", () => {
  // A 3 x 2 board like Eye mode's: 260 x 210 buttons with 20 px gaps.
  const boxes = [] as { id: number; left: number; top: number; right: number; bottom: number }[];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) boxes.push({ id: r * 3 + c, left: 215 + c * 280, top: 330 + r * 230, right: 475 + c * 280, bottom: 540 + r * 230 });
  const pick = (x: number, y: number, previous?: number | null) => pickGazeTarget({ x, y }, boxes, { radius: 110, previous });
  assert.equal(pick(300, 400), 0, "on a button");
  assert.equal(pick(485, 430), 0, "in the gap, closer to the left button: snaps to it");
  assert.equal(pick(495, 430), 1, "in the gap, closer to the right button");
  assert.equal(pick(300, 700), 3, "below the board still reaches the nearest button inside the radius");
  assert.equal(pick(300, 1000), null, "far from everything: nothing");
  // Hysteresis: hovering on the line between two buttons keeps the one it was on.
  assert.equal(pick(496, 430, 0), 0, "slightly nearer the right button, but it stays on the left one");
  assert.equal(pick(540, 430, 0), 1, "clearly on the right button: it switches");
  // Nested controls: the smaller one wins.
  const nested = [
    { id: 10, left: 0, top: 0, right: 400, bottom: 100 },
    { id: 11, left: 20, top: 20, right: 60, bottom: 60 },
  ];
  assert.equal(pickGazeTarget({ x: 30, y: 30 }, nested, { radius: 50 }), 11);
});

test("FixationFilter steadies a long look and starts over at once when the eyes jump", () => {
  const filter = new FixationFilter();
  // A steady look at (400, 300) with jitter, then a jump to (900, 500).
  let jitter = 0;
  const noisy = (cx: number, cy: number) => {
    jitter += 1;
    return { x: cx + Math.sin(jitter * 2.3) * 30, y: cy + Math.cos(jitter * 1.7) * 30 };
  };
  let out = { x: 0, y: 0 };
  let rawWorst = 0;
  let steadyWorst = 0;
  for (let i = 0; i < 40; i++) {
    const p = noisy(400, 300);
    out = filter.next(p, i * 33, 100);
    if (i >= 20) {
      rawWorst = Math.max(rawWorst, Math.hypot(p.x - 400, p.y - 300));
      steadyWorst = Math.max(steadyWorst, Math.hypot(out.x - 400, out.y - 300));
    }
  }
  assert.ok(steadyWorst < rawWorst * 0.45, `a held look should be much steadier (${steadyWorst.toFixed(1)} vs ${rawWorst.toFixed(1)})`);
  // The eyes move: within a few frames the output is at the new place, not dragged back toward the old.
  let landed = -1;
  for (let i = 0; i < 12; i++) {
    out = filter.next(noisy(900, 500), (40 + i) * 33, 100);
    if (landed < 0 && Math.hypot(out.x - 900, out.y - 500) < 60) landed = i;
  }
  assert.ok(landed >= 0 && landed <= 4, `a real move should be followed within a few frames (took ${landed})`);
});

test("PostureMonitor flags a head that has moved since calibration, once, and clears when it comes back", () => {
  const ref = { cx: 0.5, cy: 0.45, scale: 0.2, yaw: 0, pitch: 0 };
  const monitor = new PostureMonitor();
  for (let i = 0; i < 40; i++) monitor.addReference({ ...ref, cx: ref.cx + Math.sin(i) * 0.002 });
  assert.equal(monitor.lockReference(), true);
  let t = 0;
  const feed = (p: typeof ref, ms: number) => {
    let v = monitor.next(p, t);
    for (const end = t + ms; t < end; t += 33) v = monitor.next(p, t);
    return v;
  };
  assert.equal(feed(ref, 2000), "ok", "sitting as calibrated is fine");
  assert.equal(feed({ ...ref, cx: ref.cx + 0.09 }, 600), "ok", "a move that has not lasted is not flagged");
  assert.equal(feed({ ...ref, cx: ref.cx + 0.09 }, 2000), "moved", "a lasting sideways move (0.45 eye-spans) is flagged");
  assert.equal(feed({ ...ref, cx: ref.cx + 0.05 }, 2000), "moved", "still partly out: it stays flagged (hysteresis)");
  assert.equal(feed(ref, 200), "ok", "back where it was: cleared");
  assert.equal(feed({ ...ref, scale: 0.2 * 1.15 }, 2000), "distance", "leaning in is flagged");
  assert.equal(feed(ref, 200), "ok");
  assert.equal(feed({ ...ref, yaw: 0.14 }, 2000), "turned", "turning the head is flagged");
  // No reference, nothing to compare with.
  assert.equal(new PostureMonitor().next(ref, 0), "ok");
  assert.equal(new PostureMonitor().lockReference(), false);
  // Posture reads from landmarks and refuses an incomplete face.
  assert.equal(postureOf(null), null);
  assert.equal(postureOf([]), null);
});

test("LightMonitor flags a lasting change in face brightness and a face too dark to track", () => {
  const monitor = new LightMonitor();
  for (let i = 0; i < 30; i++) monitor.addReference(0.5);
  assert.equal(monitor.lockReference(), 0.5);
  let t = 0;
  const feed = (level: number, ms: number) => {
    let v = monitor.next(level, t);
    for (const end = t + ms; t < end; t += 500) v = monitor.next(level, t);
    return v;
  };
  assert.equal(feed(0.52, 4000), "ok", "ordinary variation is fine");
  assert.equal(feed(0.25, 1000), "ok", "a brief change is ignored");
  assert.equal(feed(0.25, 4000), "changed", "a lasting drop to half the level is flagged");
  assert.equal(feed(0.5, 1000), "ok", "back to normal clears it");
  const dim = new LightMonitor();
  for (let i = 0; i < 10; i++) dim.addReference(0.1);
  assert.equal(dim.isDark, true, "a dim calibration is reported as dark");
  assert.equal(dim.lockReference(), 0.1);
  let td = 0;
  let v = dim.next(0.1, td);
  for (; td < 4000; td += 500) v = dim.next(0.1, td);
  assert.equal(v, "dark");
});

test("OneEuroFilter is steady at rest and follows a real jump without lag", () => {
  const filter = new OneEuroFilter(0.3, 0.002, 0.5);
  let n = 0;
  const noise = () => Math.sin(++n * 12.9898) * 40;
  let rest = 0;
  let out = { x: 0, y: 0 };
  for (let i = 0; i < 60; i++) {
    out = filter.next({ x: 400 + noise(), y: 400 + noise() }, 33);
    if (i >= 30) rest = Math.max(rest, Math.hypot(out.x - 400, out.y - 400));
  }
  assert.ok(rest < 40, `at rest the output should be steadier than the raw ±40 px (${rest.toFixed(1)})`);
  let frames = -1;
  for (let i = 0; i < 12; i++) {
    out = filter.next({ x: 900 + noise(), y: 400 + noise() }, 33);
    if (frames < 0 && Math.abs(out.x - 900) < 75) frames = i;
  }
  assert.ok(frames >= 0 && frames <= 3, `a 500 px jump should be followed within 3 frames (took ${frames})`);
  assert.deepEqual(new OneEuroFilter().next({ x: 5, y: 6 }, 33), { x: 5, y: 6 });
});

test("BlinkGuard does not mistake a noisy eye-opening reading for blinks, and still catches real ones", () => {
  // The eye-opening reading from a webcam is noisy frame to frame. A guard tuned on a clean signal threw
  // away half of all frames at 3% noise with nobody blinking; it must leave a noisy steady look alone.
  const noise = (i: number, pct: number) => 0.26 * (1 + (Math.sin(i * 12.9898) + Math.sin(i * 78.233 + 1.7)) * 0.7 * (pct / 100));
  for (const pct of [3, 6, 8]) {
    const guard = new BlinkGuard();
    let dropped = 0;
    for (let i = 0; i < 900; i++) if (!guard.next({ x: 0, y: 0, a: noise(i, pct), p: 0 }, i * 33)) dropped++;
    assert.ok(dropped <= 9, `${pct}% noise, no blinks: ${dropped} of 900 frames dropped`);
  }
  // Real blinks every 75 frames inside 4.5% noise: the deepest frame of every blink is dropped.
  const guard = new BlinkGuard();
  let caught = 0;
  let blinks = 0;
  for (let i = 0; i < 1500; i++) {
    const phase = i % 75;
    const depth = phase >= 30 && phase < 36 ? (phase < 33 ? (phase - 29) / 3 : (36 - phase) / 3) : 0;
    const out = guard.next({ x: 0, y: 0.04 * depth, a: noise(i, 4.5) - 0.15 * depth, p: 0 }, i * 33);
    if (phase === 32 && i > 150) {
      blinks++;
      if (!out) caught++;
    }
  }
  assert.ok(blinks >= 15 && caught >= blinks - 1, `caught ${caught} of ${blinks} blinks`);
});

test("edgeSafePx keeps a margin that scales with the screen and widens on request", () => {
  assert.equal(edgeSafePx(1280, 800), 64, "laptop: 8% of the shorter side");
  assert.equal(edgeSafePx(1440, 900), 72);
  assert.equal(edgeSafePx(1920, 1080), 86);
  assert.equal(edgeSafePx(390, 844), 31, "phone: small, so the board still fits");
  assert.equal(edgeSafePx(300, 300), 24, "never below 24 px");
  assert.equal(edgeSafePx(5000, 3000), 112, "never above 112 px");
  assert.ok(edgeSafePx(1280, 800, true) > edgeSafePx(1280, 800) * 1.5, "the wide setting is clearly further in");
  assert.equal(edgeSafePx(1280, 800, true), 112);
});


test("calibration cannot learn a blink/head-motion shortcut, even with near-perfect correlation", () => {
  const samples = sweep(40, { kx: 0.25, ky: 0.09, ka: 0.12, noise: 0.003, outliers: 0 });
  for (const s of samples) s.features.p = (s.screen.y - 0.5) * 0.001;
  const fit = fitGazeCalibration(samples);
  assert.ok(fit.mapping);
  assert.equal(fit.mapping.y[1], 0);
  assert.equal(fit.mapping.y[2], 0);
  const f = { x: 0, y: 0, a: 0.26, p: 0 };
  const centre = applyGazeMapping(fit.mapping, f);
  assert.deepEqual(applyGazeMapping(fit.mapping, { ...f, a: 0.09, p: 0.04 }), centre);
  assert.equal(outcome(fitGazeCalibration(samples.map(s => ({ ...s, features: { ...s.features, y: 0 } })))), "no-spread");
});

test("head yaw cannot inject an arbitrary horizontal offset into unchanged irises", () => {
  const base = gazeFeatures(face({}))!;
  const turned = gazeFeatures(face({ 1: { x: 0.55, y: 0.5 } }))!;
  assert.equal(turned.x, base.x);
});

test("blink lookbehind removes onset frames before they can pollute a fixation and resumes", () => {
  const guard = new BlinkGuard();
  const buffer = new BlinkSafeBuffer();
  const passed: { y: number; at: number }[] = [];
  for (const { f, t } of blinkFrames()) {
    const read = buffer.next(guard.next(f, t), t);
    if (read) passed.push({ y: read.features.y, at: read.at });
  }
  assert.ok(passed.length > 8, "must recover, not freeze indefinitely");
  assert.ok(passed.every(p => p.y === 0), "even closing frames before blink detection must be discarded");
  const open = { x: 0, y: 0, a: 0.26, p: 0 };
  buffer.next(open, 2000);
  assert.equal(buffer.next(open, 3000), null, "a camera gap cannot release stale data");
  buffer.reset();
  assert.equal(buffer.next(open, 4000), null);
});

test("head movement invalidates selection immediately, and returning or recentering restores it", () => {
  const ref = { cx: 0.5, cy: 0.45, scale: 0.2, yaw: 0, pitch: 0 };
  const monitor = new PostureMonitor();
  for (let i = 0; i < 20; i++) monitor.addReference(ref);
  monitor.lockReference();
  const moved = { ...ref, cx: 0.6 };
  assert.equal(monitor.outside(moved), "moved");
  assert.equal(monitor.next(moved, 0), "ok", "hint debounce must not delay selection guard");
  assert.equal(monitor.outside(ref), "ok");
  monitor.reset();
  for (let i = 0; i < 20; i++) monitor.addReference(moved);
  monitor.lockReference();
  assert.equal(monitor.outside(moved), "ok");
});


test("iris coordinates survive whole-face translation and distance changes", () => {
  const original = face({ 468: { x: 0.444, y: 0.464 }, 473: { x: 0.544, y: 0.464 } });
  const baseline = gazeFeatures(original)!;
  for (const scale of [0.8, 1, 1.2]) {
    for (const offset of [-0.04, 0.04]) {
      const moved = original.map(p => ({ ...p, x: 0.5 + (p.x - 0.5) * scale + offset, y: 0.5 + (p.y - 0.5) * scale - offset }));
      const f = gazeFeatures(moved)!;
      assert.ok(Math.abs(f.x - baseline.x) < 1e-10);
      assert.ok(Math.abs(f.y - baseline.y) < 1e-10);
    }
  }
});

test("a minute of repeated blinks does not accumulate offset or stop the filtered pointer", () => {
  for (const fps of [15, 30, 60]) {
    const guard = new BlinkGuard();
    const buffer = new BlinkSafeBuffer();
    const smoother = new FeatureSmoother();
    const map = { x: [-4, 0.9] as [number, number], y: [10, 0, 0, 0.5] as [number, number, number, number] };
    let updates = 0;
    let finalAt = 0;
    for (let t = 0; t < 60000; t += 1000 / fps) {
      const phase = t % 3000;
      const depth = phase >= 1000 && phase < 1200 ? Math.sin((phase - 1000) / 200 * Math.PI) : 0;
      const observed = guard.next({ x: 0.1, y: 0.04 * depth, a: 0.26 - 0.18 * depth, p: 0 }, t);
      if (!observed) smoother.reset();
      const read = buffer.next(observed, t);
      if (!read) continue;
      assert.ok(t - read.at >= 100 && t - read.at < 100 + 1000 / fps + 0.01);
      const p = applyGazeMapping(map, smoother.next(read.features, 1000 / fps));
      assert.ok(Math.abs(p.y - 0.5) < 0.07, `blink shift at ${fps} fps: ${p.y}`);
      updates++;
      finalAt = t;
    }
    assert.ok(updates > fps * 40, "most open-eye frames must remain usable");
    assert.ok(finalAt > 59800, "tracking must still be updating at the end");
  }
});
