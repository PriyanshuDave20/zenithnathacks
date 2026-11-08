import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiErrorSchema, TranslateResponseSchema } from "../../../lib/contracts";
import { STORIES } from "../../../lib/server/fixtures/stories";
import * as llm from "../../../lib/server/llm";
import { POST } from "./handler";

function request(body: unknown): Request {
  return new Request("http://localhost/api/translate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

test("POST returns contract-shaped fixture JSON, defaults reading level, and prevents caching", async () => {
  const story = STORIES[1];
  const response = await POST(request({ ...story.translateRequest, context: { language: "es", mode: "standard" } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type") ?? "", /application\/json/);
  assert.deepEqual(TranslateResponseSchema.parse(await response.json()), story.translateResponse);
});

test("POST rejects invalid JSON, undeclared identifier fields, and invalid contracts without calling the model", async (t) => {
  const model = t.mock.method(llm, "callModel", async () => { throw new Error("Must not be called"); });
  const invalid = [
    request(null), request({}),
    request({ ...STORIES[0].translateRequest, name: "Synthetic secret" }),
    request({ ...STORIES[0].translateRequest, context: { language: "en", mode: "unsupported" } }),
    request({ ...STORIES[0].translateRequest, inputs: [{ kind: "other", value: "Synthetic secret" }] }),
    new Request("http://localhost/api/translate", { method: "POST", body: "{Synthetic secret" }),
  ];
  for (const input of invalid) {
    const response = await POST(input);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = ApiErrorSchema.parse(await response.json());
    assert.equal(body.error.code, "invalid_request");
    assert.doesNotMatch(JSON.stringify(body), /Synthetic secret/);
  }
  assert.equal(model.mock.callCount(), 0);
});

test("POST rejects invalid selections with a generic 400", async () => {
  const response = await POST(request({
    context: STORIES[0].translateRequest.context,
    inputs: [{ questionId: "where", kind: "pictogram", value: "arm" }],
  }));
  assert.equal(response.status, 400);
  assert.equal(ApiErrorSchema.parse(await response.json()).error.code, "invalid_request");
});

test("POST maps provider exceptions and malformed output to generic 502 responses without logging bodies", async (t) => {
  const logs = ["log", "error", "warn", "info", "debug"].map((method) =>
    t.mock.method(console, method as "log", () => {}));
  const model = t.mock.method(llm, "callModel", async () => { throw new Error("Synthetic private provider detail"); });
  for (const implementation of [
    async () => { throw new Error("Synthetic private provider detail"); },
    async () => "Synthetic private malformed output",
    async () => JSON.stringify({ patientName: "Synthetic private output" }),
  ]) {
    model.mock.mockImplementation(implementation);
    const response = await POST(request(STORIES[0].translateRequest));
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = ApiErrorSchema.parse(await response.json());
    assert.equal(body.error.code, "model_failure");
    assert.doesNotMatch(JSON.stringify(body), /Synthetic private/);
  }
  for (const log of logs) assert.equal(log.mock.callCount(), 0);
});

test("POST does not retain prior request content", async () => {
  const first = await POST(request({ context: STORIES[0].translateRequest.context, inputs: [{ kind: "text", value: "Synthetic first request only" }] }));
  assert.equal(first.status, 200);
  const second = await POST(request(STORIES[0].translateRequest));
  assert.equal(second.status, 200);
  const body = TranslateResponseSchema.parse(await second.json());
  assert.deepEqual(body, STORIES[0].translateResponse);
  assert.doesNotMatch(JSON.stringify(body), /first request only/);
});
