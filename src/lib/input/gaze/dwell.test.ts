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
  // Looking away rearms the control after the cooldown.
  s = d.update(10002 + DEFAULT_DWELL.cooldownMs, "a");
  assert.equal(s.target, "a");
  assert.equal(s.progress, 0);
});

test("moving to another target, or off, restarts the dwell", () => {
  const d = new DwellController({ radius: 56, durationMs: 2000, cooldownMs: 0 });
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

test("jitter within the window is the caller's job; the controller only keys on identity", () => {
  const d = new DwellController({ radius: 56, durationMs: 1000, cooldownMs: 0 });
  d.update(0, "1");
  assert.equal(d.update(999, "1").progress, 0.999);
  // A numeric-string key switch resets, even between two distinct elements.
  assert.equal(d.update(1000, "2").progress, 0);
});
