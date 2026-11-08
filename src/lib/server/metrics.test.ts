import assert from "node:assert/strict";
import { test } from "node:test";
import { MetricsEventSchema, ModeSchema } from "../contracts";
import { createMetrics, incrementMetricCount } from "./metrics";

test("metrics start empty and count submitted events independently for every mode", () => {
  const metrics = createMetrics();
  for (const mode of ModeSchema.options) {
    for (const event of MetricsEventSchema.shape.event.options) {
      assert.equal(metrics.snapshot().events[mode][event], 0);
      assert.equal(metrics.record({ event, mode }), true);
      assert.equal(metrics.record({ event, mode }), true);
    }
  }
  const snapshot = metrics.snapshot();
  for (const mode of ModeSchema.options) {
    assert.deepEqual(snapshot.events[mode], { session_started: 2, first_message: 2, teachback_confirmed: 2 });
    assert.equal(snapshot.firstMessageDuration[mode].unknown, 2);
  }
  assert.deepEqual(createMetrics().snapshot().events.standard, { session_started: 0, first_message: 0, teachback_confirmed: 0 });
});

test("only first messages increment coarse timing buckets, accepting all contract-valid durations", () => {
  const metrics = createMetrics();
  for (const msSinceStart of [0, 9_999.5, 10_000, 29_999, 30_000, 59_999, 60_000, 299_999, 300_000, Number.MAX_VALUE]) {
    assert.equal(metrics.record({ event: "first_message", mode: "low_literacy", msSinceStart }), true);
  }
  metrics.record({ event: "first_message", mode: "low_literacy" });
  metrics.record({ event: "session_started", mode: "low_literacy", msSinceStart: 12_345 });
  metrics.record({ event: "teachback_confirmed", mode: "low_literacy", msSinceStart: 12_345 });
  assert.deepEqual(metrics.snapshot().firstMessageDuration.low_literacy, {
    under_10s: 2, under_30s: 2, under_60s: 2, under_5m: 2, at_least_5m: 2, unknown: 1,
  });
  assert.equal(metrics.snapshot().events.low_literacy.first_message, 11);
  assert.equal(metrics.snapshot().firstMessageDuration.standard.under_10s, 0);
});

test("invalid events and extra identifier/content fields never change the aggregates", () => {
  const metrics = createMetrics();
  const before = metrics.snapshot();
  for (const event of [null, {}, [], { event: "unknown", mode: "standard" },
    { event: "first_message", mode: "unknown" },
    ...[-1, NaN, Infinity, "12", null].map(msSinceStart => ({ event: "first_message", mode: "mute", msSinceStart })),
    ...["name", "sessionId", "message", "language", "timestamp"].map(key => ({ event: "first_message", mode: "standard", [key]: "Synthetic prohibited detail" })),
  ]) {
    assert.equal(metrics.record(event), false);
  }
  assert.deepEqual(metrics.snapshot(), before);
});

test("snapshots are detached fixed-shape aggregates and never retain exact timings or caller objects", () => {
  const metrics = createMetrics();
  const event = { event: "first_message", mode: "deaf_hoh", msSinceStart: 12_345.67 };
  metrics.record(event);
  event.msSinceStart = 9_876;
  const snapshot = metrics.snapshot();
  snapshot.events.deaf_hoh.first_message = 999;
  snapshot.firstMessageDuration.deaf_hoh.under_30s = 999;
  assert.equal(metrics.snapshot().events.deaf_hoh.first_message, 1);
  assert.equal(metrics.snapshot().firstMessageDuration.deaf_hoh.under_30s, 1);
  assert.doesNotMatch(JSON.stringify(metrics.snapshot()), /12345|9876|msSinceStart/);
  const shape = Object.keys(metrics.snapshot());
  for (let n = 0; n < 1000; n++) metrics.record({ event: "first_message", mode: "icu", msSinceStart: n });
  assert.deepEqual(Object.keys(metrics.snapshot()), shape);
  assert.deepEqual(Object.keys(metrics.snapshot().events), ModeSchema.options);
  assert.equal(Object.keys(metrics.snapshot().firstMessageDuration.icu).length, 6);
});

test("metric counts saturate at a safe integer instead of overflowing", () => {
  assert.equal(incrementMetricCount(0), 1);
  assert.equal(incrementMetricCount(Number.MAX_SAFE_INTEGER - 1), Number.MAX_SAFE_INTEGER);
  assert.equal(incrementMetricCount(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
});
