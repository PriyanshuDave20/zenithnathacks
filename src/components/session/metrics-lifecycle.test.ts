import assert from "node:assert/strict";
import { test } from "node:test";
import { MetricsEventSchema, type MetricsEvent } from "../../lib/contracts";
import { SessionMetrics } from "./metrics-lifecycle";

test("only explicit lifecycle actions emit, once per active client flow", () => {
  const events: MetricsEvent[] = [];
  let now = 100;
  const metrics = new SessionMetrics(event => events.push(MetricsEventSchema.parse(event)), () => now);
  metrics.firstMessage();
  metrics.teachback();
  assert.deepEqual(events, []);
  metrics.start("standard");
  now = 250;
  metrics.start("standard"); // double-click or repeat handoff
  metrics.start("mute"); // accessibility changes keep the initial mode cohort
  assert.deepEqual(events, [{ event: "session_started", mode: "standard" }]);
  now = 600;
  metrics.firstMessage(); // translated confirmation or untranslated share use the same boundary
  metrics.firstMessage(); // retry, duplicate click or later message
  metrics.teachback();
  metrics.teachback(); // later affirmative reply
  assert.deepEqual(events, [
    { event: "session_started", mode: "standard" },
    { event: "first_message", mode: "standard", msSinceStart: 500 },
    { event: "teachback_confirmed", mode: "standard" },
  ]);
});

test("clear, expiry and navigation reset all flags and remove the previous clock", () => {
  const events: MetricsEvent[] = [];
  let now = 100;
  const metrics = new SessionMetrics(event => events.push(event), () => now);
  metrics.start("low_literacy");
  metrics.firstMessage();
  metrics.teachback();
  metrics.reset();
  metrics.firstMessage(); // late work after clear is ignored
  metrics.teachback();
  assert.equal(events.length, 3);
  now = 2_000;
  metrics.start("icu");
  now = 2_100;
  metrics.firstMessage();
  metrics.teachback();
  assert.deepEqual(events.slice(3), [
    { event: "session_started", mode: "icu" },
    { event: "first_message", mode: "icu", msSinceStart: 100 },
    { event: "teachback_confirmed", mode: "icu" },
  ]);
});

test("invalid or backwards elapsed clocks never send a negative or nonfinite duration", () => {
  for (const end of [-20, Infinity, NaN]) {
    const events: MetricsEvent[] = [];
    let now = 10;
    const metrics = new SessionMetrics(event => events.push(MetricsEventSchema.parse(event)), () => now);
    metrics.start("deaf_hoh");
    now = end;
    metrics.firstMessage();
    assert.deepEqual(events[1], Number.isFinite(end)
      ? { event: "first_message", mode: "deaf_hoh", msSinceStart: 0 }
      : { event: "first_message", mode: "deaf_hoh" });
  }
});
