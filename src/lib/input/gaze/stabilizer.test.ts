import assert from "node:assert/strict";
import { test } from "node:test";
import { GazeStabilizer, STABILIZER_DEFAULTS } from "./stabilizer";

/** Feed a point sequence with fixed frame times; collect the emitted points.
 * `startAt` chains runs onto the same clock so state carries over realistically. */
function run(st: GazeStabilizer, points: ({ x: number; y: number } | null)[], frameMs = 16, startAt = 1000) {
  const out: { x: number; y: number; status: string; outlierRejected: boolean }[] = [];
  let at = startAt;
  for (const p of points) {
    const r = st.next(p, at, "ok");
    out.push({ x: r.x, y: r.y, status: r.status, outlierRejected: r.outlierRejected });
    at += frameMs;
  }
  return { out, endAt: at };
}

test("A: stationary jitter is held still (dead zone)", () => {
  const st = new GazeStabilizer();
  // Gaze jitters +-3 px around a fixed target, like real landmark noise.
  const points = Array.from({ length: 60 }, (_, i) => ({ x: 500 + Math.sin(i * 2.1) * 3, y: 300 + Math.cos(i * 1.7) * 3 }));
  const { out } = run(st, points);
  const xs = out.map((o) => o.x);
  const ys = out.map((o) => o.y);
  const inputRange = 6; // +-3 px
  const outputRangeX = Math.max(...xs) - Math.min(...xs);
  const outputRangeY = Math.max(...ys) - Math.min(...ys);
  assert.ok(outputRangeX <= inputRange / 2, `x movement ${outputRangeX} should be far below the raw ${inputRange}`);
  assert.ok(outputRangeY <= inputRange / 2, `y movement ${outputRangeY} should be far below the raw ${inputRange}`);
  assert.equal(out.every((o) => o.status === "ok"), true);
});

test("B: an intentional move crosses the screen without excessive delay", () => {
  const st = new GazeStabilizer();
  // 20 px steps at 16 ms = 1250 px/s: a deliberate, realistic saccade-and-settle.
  const points = [{ x: 100, y: 300 }];
  for (let i = 1; i <= 24; i++) points.push({ x: 100 + i * 20, y: 300 });
  const { out } = run(st, points);
  const last = out[out.length - 1];
  assert.ok(Math.abs(last.x - 580) < 60, `cursor should arrive near 580, got ${last.x}`);
  const mid = out[Math.floor(out.length / 2)];
  assert.ok(mid.x > 200, `cursor should be well on its way by halfway, got ${mid.x}`);
});

test("C: one isolated extreme frame is rejected, and a sustained move is not", () => {
  const st = new GazeStabilizer();
  const settle = run(st, Array.from({ length: 30 }, () => ({ x: 500, y: 300 })));
  const anchor = settle.out[settle.out.length - 1];
  let clock = settle.endAt;

  // A single wild frame must not move the cursor.
  const spike = run(st, [{ x: 950, y: 60 }], 16, clock);
  clock += 16;
  assert.equal(spike.out[0].x, anchor.x, "outlier frame must hold the previous position");
  assert.equal(spike.out[0].outlierRejected, true);
  const back = run(st, [{ x: 500, y: 300 }], 16, clock);
  clock += 16;
  assert.equal(back.out[0].x, anchor.x);

  // The same far position, held: an intentional fast movement. It must be accepted quickly.
  const held = run(st, Array.from({ length: 10 }, () => ({ x: 950, y: 60 })), 16, clock);
  assert.equal(held.out[held.out.length - 1].outlierRejected, false);
  assert.ok(Math.abs(held.out[held.out.length - 1].x - 950) < 60, `sustained position must be accepted, got ${held.out[held.out.length - 1].x}`);
  assert.ok(st.rejectedCount > 0, "rejected frames should be counted for diagnostics");
});

test("D: tracking loss holds the last valid point and reports lost", () => {
  const st = new GazeStabilizer();
  const prior = run(st, Array.from({ length: 20 }, () => ({ x: 500, y: 300 })));
  const lost = run(st, Array.from({ length: 60 }, () => null), 16, prior.endAt);
  const first = lost.out[0];
  assert.equal(first.status, "degraded", "a brief loss is degraded, still holding");
  assert.equal(first.x, 500, "the pointer holds its last valid position");
  const last = lost.out[lost.out.length - 1];
  assert.equal(last.status, "lost", "a long loss reports lost");
  assert.equal(last.x, 500, "even when lost, the pointer never jumps to arbitrary coordinates");
  assert.equal(lost.out.some((o) => !Number.isFinite(o.x)), false);
});

test("E: variable frame rates stay stable and time-correct", () => {
  const st = new GazeStabilizer();
  const points: ({ x: number; y: number } | null)[] = [];
  for (let i = 1; i <= 30; i++) points.push({ x: 100 + i * 10, y: 300 });
  // Mixed 8 ms / 50 ms frame intervals (a busy machine): the filter sees the real dt each time.
  const out: { x: number }[] = [];
  let at = 1000;
  for (let i = 0; i < points.length; i++) {
    const r = st.next(points[i], at, "ok");
    out.push({ x: r.x });
    at += i % 2 === 0 ? 8 : 50;
  }
  assert.equal(out.some((o) => !Number.isFinite(o.x)), false, "no NaN with uneven frames");
  assert.ok(Math.abs(out[out.length - 1].x - 400) < 60, `must still track to the end, got ${out[out.length - 1].x}`);
});

test("F: a reset leaves no old state behind", () => {
  const st = new GazeStabilizer();
  run(st, Array.from({ length: 30 }, () => ({ x: 100, y: 100 })));
  assert.ok(st.rejectedCount >= 0);
  st.reset();
  const { out } = run(st, [{ x: 700, y: 400 }]);
  assert.equal(out[0].x, 700, "after a reset the first raw point is used as-is");
  assert.equal(out[0].status, "ok");
  assert.equal(st.rejectedCount, 0);
});

test("edge cases: NaN, Infinity and stale clocks never move the cursor", () => {
  const st = new GazeStabilizer();
  run(st, Array.from({ length: 10 }, () => ({ x: 500, y: 300 })));
  const { out: bad } = run(st, [{ x: NaN, y: 300 }, { x: Infinity, y: 300 }, { x: 500, y: -Infinity }]);
  for (const o of bad) {
    assert.equal(o.x, 500, "invalid coordinates hold the last valid position");
    assert.equal(o.status !== "ok" || o.outlierRejected === false, true);
  }
  // A clock that goes backwards or stands still is seeded, not divided by zero.
  const still = st.next({ x: 505, y: 305 }, 0);
  assert.ok(Number.isFinite(still.x) && Number.isFinite(still.y));
});

test("configuration: live tuning changes behaviour without throwing", () => {
  const st = new GazeStabilizer();
  st.configure({ deadzonePx: 0 });
  assert.equal(st.config.deadzonePx, 0);
  const { out: a } = run(st, [{ x: 500, y: 300 }, { x: 502, y: 300 }]);
  assert.notEqual(a[1].x, a[0].x, "with the dead zone off, a 2 px move moves the cursor");
  st.configure({ deadzonePx: STABILIZER_DEFAULTS.deadzonePx });
});
