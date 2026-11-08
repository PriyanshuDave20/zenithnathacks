import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyGazeMapping,
  defaultMapping,
  fitGazeMapping,
  gazeFeatures,
  median,
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
  // Left eye: corners x 0.42..0.48, lids y 0.44..0.48, iris in the middle.
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

test("fitGazeMapping recovers an exact affine map; degenerate samples are rejected", () => {
  const samples = [
    { features: { x: -0.4, y: -0.3 }, screen: { x: 0.1, y: 0.14 } },
    { features: { x: 0.4, y: -0.3 }, screen: { x: 0.9, y: 0.14 } },
    { features: { x: -0.4, y: 0.3 }, screen: { x: 0.1, y: 0.86 } },
    { features: { x: 0.4, y: 0.3 }, screen: { x: 0.9, y: 0.86 } },
    { features: { x: 0, y: 0 }, screen: { x: 0.5, y: 0.5 } },
  ];
  const fitted = fitGazeMapping(samples);
  assert.ok(fitted);
  for (const s of samples) {
    const p = applyGazeMapping(fitted, s.features);
    assert.ok(Math.abs(p.x - s.screen.x) < 1e-6 && Math.abs(p.y - s.screen.y) < 1e-6);
  }
  assert.equal(fitGazeMapping(samples.slice(0, 2)), null);
  assert.equal(fitGazeMapping([]), null);
  // All-identical features cannot be fitted.
  const stuck = samples.map((s) => ({ ...s, features: { x: 0.1, y: 0.1 } }));
  assert.equal(fitGazeMapping(stuck), null);
});

test("median and SmoothedPoint behave", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);

  const s = new SmoothedPoint(0.2, 0.2, 0); // fixed alpha for a deterministic test
  const a = s.next({ x: 0, y: 0 }, 16);
  assert.equal(a.x, 0);
  const b = s.next({ x: 100, y: 50 }, 16);
  assert.equal(b.x, 20); // 0 + (100-0) * 0.2
  assert.ok(b.x < s.next({ x: 100, y: 50 }, 16).x && s.next({ x: 100, y: 50 }, 16).x < 100);
  s.reset();
  assert.deepEqual(s.next({ x: 5, y: 6 }, 16), { x: 5, y: 6 });
});
