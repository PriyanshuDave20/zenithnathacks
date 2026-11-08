import assert from "node:assert/strict";
import { test } from "node:test";
import { DwellController, DEFAULT_DWELL } from "./dwell";

test("dwell accumulates on one target and fires at the duration", () => {
  const d = new DwellController();
  let s = d.update(0, "a");
  assert.equal(s.target, "a");
  assert.equal(s.progress, 0);
  s = d.update(1000, "a");
  assert.equal(s.progress, 0.5);
  s = d.update(2000, "a");
  assert.equal(s.progress, 1);
  d.fired(2000);
  // Cooldown: no dwell right after firing.
  s = d.update(2100, "a");
  assert.equal(s.target, null);
  assert.equal(s.progress, 0);
  // A continuous stare must not activate the same control twice.
  assert.equal(d.update(10000, "a").target, null);
  d.update(10001, null);
  d.update(10301, null);
  // Looking away rearms the control after the cooldown.
  s = d.update(10002 + DEFAULT_DWELL.cooldownMs, "a");
  assert.equal(s.target, "a");
  assert.equal(s.progress, 0);
});

test("moving to another target, or off, restarts the dwell", () => {
  const d = new DwellController({ radius: 56, durationMs: 2000, cooldownMs: 0, jitterGraceMs: 0 });
  d.update(0, "a");
  d.update(1500, "a");
  let s = d.update(1600, "b"); // different target: back to zero
  assert.equal(s.target, "b");
  assert.equal(s.progress, 0);
  s = d.update(3000, "b");
  assert.equal(s.progress, 0.7);
  s = d.update(3100, null); // gaze left every control: no dwell
  assert.equal(s.target, null);
  assert.equal(s.progress, 0);
  s = d.update(3200, "b"); // arriving at the target starts the clock at zero
  assert.equal(s.target, "b");
  assert.equal(s.progress, 0);
  s = d.update(3300, "b");
  assert.equal(s.progress, 0.05);
});

test("zero-grace configuration retains immediate target switching", () => {
  const d = new DwellController({ radius: 56, durationMs: 1000, cooldownMs: 0, jitterGraceMs: 0 });
  d.update(0, "1");
  assert.equal(d.update(999, "1").progress, 0.999);
  // A numeric-string key switch resets, even between two distinct elements.
  assert.equal(d.update(1000, "2").progress, 0);
});


test("short jitter pauses progress, resumes the same button, and never transfers credit", () => {
  const d = new DwellController();
  d.update(0, "a");
  assert.equal(d.update(1000, "a").progress, 0.5);
  assert.deepEqual(d.update(1033, "b"), { target: "a", progress: 0.5 });
  assert.deepEqual(d.update(1100, null), { target: "a", progress: 0.5 });
  assert.equal(d.update(1200, "a").progress, 0.5, "off-target time earns no progress");
  assert.equal(d.update(1700, "a").progress, 0.75);
  assert.equal(d.update(2200, "a").progress, 1);
  d.fired(2200);
  d.update(3300, "b");
  d.update(3400, "a");
  assert.equal(d.update(5000, "a").target, null, "brief jitter must not rearm the fired target");
});

test("sustained look away or another button resets, without inheriting old progress", () => {
  const d = new DwellController();
  d.update(0, "a");
  d.update(1500, "a");
  d.update(1600, "b");
  assert.deepEqual(d.update(1850, "b"), { target: "b", progress: 0 });
  assert.equal(d.update(2850, "b").progress, 0.5);
  d.update(2900, null);
  assert.equal(d.update(3200, null).target, null);
  assert.equal(d.update(3300, "b").progress, 0);
});

test("tracking loss pauses briefly but cannot finish a dwell or rearm a fired button", () => {
  const d = new DwellController();
  d.update(0, "a");
  d.update(1900, "a");
  assert.equal(d.update(1950, null, false).progress, 0.95);
  assert.equal(d.update(2100, "a").progress, 0.95);
  assert.equal(d.update(2200, "a").progress, 1);
  d.fired(2200);
  d.update(3200, null, false);
  d.update(4000, null, false);
  assert.equal(d.update(4200, "a").target, null);
  d.update(4300, null);
  d.update(4600, null);
  assert.equal(d.update(4700, "a").target, "a", "a sustained valid look away rearms");
  d.update(5700, "a");
  d.interrupt(5750);
  assert.equal(d.update(5800, "a").progress, 0, "invalid pose or hidden page discards progress");
});

test("long tracking loss discards incomplete progress; zero grace remains available", () => {
  const d = new DwellController();
  d.update(0, "a");
  d.update(1900, "a");
  d.update(2000, null, false);
  assert.equal(d.update(2300, null, false).target, null);
  assert.equal(d.update(2400, "a").progress, 0);
});
