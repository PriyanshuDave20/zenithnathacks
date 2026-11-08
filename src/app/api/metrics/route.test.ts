import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiErrorSchema, MetricsEventSchema, ModeSchema } from "../../../lib/contracts";
import { metrics } from "../../../lib/server/metrics";
import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/metrics", { method: "POST", body: JSON.stringify(body) });
}

test("metrics POST accepts every existing event/mode with an empty no-store 204", async () => {
  const before = metrics.snapshot();
  for (const mode of ModeSchema.options) {
    for (const event of MetricsEventSchema.shape.event.options) {
      for (const timing of [{}, { msSinceStart: 0 }, { msSinceStart: 0.5 }, { msSinceStart: Number.MAX_VALUE }]) {
        const response = await POST(request({ event, mode, ...timing }));
        assert.equal(response.status, 204);
        assert.equal(response.headers.get("Cache-Control"), "no-store");
        assert.equal(await response.text(), "");
      }
      assert.equal(metrics.snapshot().events[mode][event] - before.events[mode][event], 4);
    }
  }
});

test("metrics rejects malformed/invalid/content-bearing requests generically without changing counts", async () => {
  const before = metrics.snapshot();
  const invalid = [request(null), request({}), request([]),
    request({ event: "unknown", mode: "standard" }),
    request({ event: "first_message", mode: "unknown" }),
    request({ event: "first_message", mode: "mute", msSinceStart: -1 }),
    request({ event: "first_message", mode: "mute", msSinceStart: "Synthetic prohibited detail" }),
    ...["name", "sessionId", "message"].map(key => request({ event: "session_started", mode: "standard", [key]: "Synthetic prohibited detail" })),
    new Request("http://localhost/api/metrics", { method: "POST" }),
    new Request("http://localhost/api/metrics", { method: "POST", body: "{Synthetic prohibited detail" }),
  ];
  for (const input of invalid) {
    const response = await POST(input);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const error = ApiErrorSchema.parse(await response.json());
    assert.equal(error.error.code, "invalid_request");
    assert.doesNotMatch(JSON.stringify(error), /Synthetic prohibited detail/);
  }
  assert.deepEqual(metrics.snapshot(), before);
});

test("metrics enforces streamed UTF-8 byte limits without relying on Content-Length", async () => {
  const before = metrics.snapshot();
  for (const body of [" ".repeat(1025), "中".repeat(342)]) {
    const response = await POST(new Request("http://localhost/api/metrics", { method: "POST", body, headers: { "Content-Length": "1" } }));
    assert.equal(response.status, 413);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(ApiErrorSchema.parse(await response.json()).error.code, "invalid_request");
  }
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(600)); controller.enqueue(new Uint8Array(600)); },
    cancel() { cancelled = true; },
  });
  const response = await POST(new Request("http://localhost/api/metrics", { method: "POST", body: stream, duplex: "half" } as RequestInit));
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
  assert.deepEqual(metrics.snapshot(), before);
  const json = JSON.stringify({ event: "session_started", mode: "standard" });
  const boundary = await POST(new Request("http://localhost/api/metrics", { method: "POST", body: json.padEnd(1024, " ") }));
  assert.equal(boundary.status, 204);
});

test("metrics handles broken streams generically and releases the reader", async () => {
  const before = metrics.snapshot();
  const stream = new ReadableStream({ start(controller) { controller.error(new Error("Synthetic prohibited detail")); } });
  const response = await POST(new Request("http://localhost/api/metrics", { method: "POST", body: stream, duplex: "half" } as RequestInit));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.doesNotMatch(JSON.stringify(ApiErrorSchema.parse(await response.json())), /Synthetic prohibited detail/);
  assert.deepEqual(metrics.snapshot(), before);
});

test("cancelled metrics requests do not count an otherwise valid event", async () => {
  const before = metrics.snapshot();
  const preAborted = new AbortController();
  preAborted.abort();
  const first = await POST(new Request("http://localhost/api/metrics", {
    method: "POST", body: JSON.stringify({ event: "session_started", mode: "standard" }), signal: preAborted.signal,
  }));
  assert.equal(first.status, 400);
  let cancelled = false;
  const controller = new AbortController();
  const stream = new ReadableStream({
    start(streamController) { streamController.enqueue(new TextEncoder().encode(JSON.stringify({ event: "session_started", mode: "standard" }))); },
    cancel() { cancelled = true; },
  });
  const pending = POST(new Request("http://localhost/api/metrics", { method: "POST", body: stream, signal: controller.signal, duplex: "half" } as RequestInit));
  controller.abort();
  assert.equal((await pending).status, 400);
  assert.equal(cancelled, true);
  assert.deepEqual(metrics.snapshot(), before);
});

test("an aggregate failure returns a generic no-store API error without exposing internal detail", async (t) => {
  t.mock.method(metrics, "record", () => { throw new Error("Synthetic prohibited detail"); });
  const response = await POST(request({ event: "session_started", mode: "standard" }));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = ApiErrorSchema.parse(await response.json());
  assert.equal(body.error.code, "metrics_unavailable");
  assert.doesNotMatch(JSON.stringify(body), /Synthetic prohibited detail/);
});

test("concurrent repeated metric submissions count events without network calls or body logging", async (t) => {
  const logs = ["log", "error", "warn", "info", "debug"].map(method => t.mock.method(console, method as "log", () => {}));
  const network = t.mock.method(globalThis, "fetch", async () => { throw new Error("No external calls permitted"); });
  const before = metrics.snapshot().events.icu.teachback_confirmed;
  const responses = await Promise.all(Array.from({ length: 50 }, () => POST(request({ event: "teachback_confirmed", mode: "icu" }))));
  assert.ok(responses.every(response => response.status === 204));
  assert.equal(metrics.snapshot().events.icu.teachback_confirmed - before, 50);
  await POST(request({ event: "first_message", mode: "standard", message: "Synthetic prohibited detail" }));
  assert.equal(network.mock.callCount(), 0);
  for (const log of logs) assert.equal(log.mock.callCount(), 0);
});
