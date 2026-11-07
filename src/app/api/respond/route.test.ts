import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiErrorSchema, RespondResponseSchema } from "../../../lib/contracts";
import { STORIES } from "../../../lib/server/fixtures/stories";
import * as llm from "../../../lib/server/llm";
import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/respond", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

test("POST returns fixture JSON with no caching and defaults reading level to 3", async (t) => {
  const story = STORIES[2];
  const realModel = llm.callModel;
  const model = t.mock.method(llm, "callModel", async (input: llm.ModelRequest) => {
    assert.equal(JSON.parse(input.user).request.context.readingLevel, 3);
    return realModel(input);
  });
  const response = await POST(request({ ...story.respondRequest, context: { language: "ar", mode: "standard" } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type") ?? "", /application\/json/);
  assert.deepEqual(RespondResponseSchema.parse(await response.json()), story.respondResponse);
  assert.equal(model.mock.callCount(), 1);
});

test("POST rejects bad JSON, contracts, identifiers and empty input without calling the model", async (t) => {
  const model = t.mock.method(llm, "callModel", async () => { throw new Error("Must not be called"); });
  const fixture = STORIES[0].respondRequest;
  for (const input of [
    request(null), request({}), request({ ...fixture, message: 5 }),
    request({ ...fixture, patientName: "Synthetic private content" }),
    request({ ...fixture, context: { ...fixture.context, name: "Synthetic private content" } }),
    request({ ...fixture, context: { ...fixture.context, mode: "unknown" } }),
    request({ ...fixture, context: { ...fixture.context, readingLevel: 6 } }),
    request({ ...fixture, context: { ...fixture.context, language: "demo@example.invalid" } }),
    request({ ...fixture, message: "  " }),
    new Request("http://localhost/api/respond", { method: "POST", body: "{Synthetic private content" }),
  ]) {
    const response = await POST(input);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = ApiErrorSchema.parse(await response.json());
    assert.equal(body.error.code, "invalid_request");
    assert.doesNotMatch(JSON.stringify(body), /Synthetic private|demo@example/);
  }
  assert.equal(model.mock.callCount(), 0);
});

test("POST redacts the message before the model and all returned fields", async (t) => {
  t.mock.method(llm, "callModel", async ({ user }: llm.ModelRequest) => {
    assert.doesNotMatch(user, /demo@example/);
    assert.equal(JSON.parse(user).request.message, "Call [removed].");
    return JSON.stringify({
      patientText: "Call 780-555-0100.", readAloudText: "Contact demo@example.invalid.", teachBackPrompt: "DOB 2000-01-02.",
    });
  });
  const response = await POST(request({ ...STORIES[0].respondRequest, message: "Call demo@example.invalid." }));
  assert.equal(response.status, 200);
  assert.deepEqual(RespondResponseSchema.parse(await response.json()), {
    patientText: "Call [removed].", readAloudText: "Contact [removed].", teachBackPrompt: "DOB [removed].",
  });
});

test("POST maps provider and output failures to generic 502 without logging content", async (t) => {
  const logs = ["log", "error", "warn", "info", "debug"].map((method) => t.mock.method(console, method as "log", () => {}));
  const model = t.mock.method(llm, "callModel", async () => "{}");
  for (const implementation of [
    async () => { throw new Error("Synthetic private provider details"); },
    async () => "Synthetic private malformed output",
    async () => JSON.stringify({ ...STORIES[0].respondResponse, extra: "Synthetic private field" }),
    async () => JSON.stringify({ ...STORIES[0].respondResponse, teachBackPrompt: " " }),
  ]) {
    model.mock.mockImplementation(implementation);
    const response = await POST(request(STORIES[0].respondRequest));
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = ApiErrorSchema.parse(await response.json());
    assert.equal(body.error.code, "model_failure");
    assert.doesNotMatch(JSON.stringify(body), /Synthetic private/);
  }
  for (const log of logs) assert.equal(log.mock.callCount(), 0);
});

test("POST uses only the current request after an unsupported reply", async () => {
  const first = await POST(request({ ...STORIES[0].respondRequest, message: "Synthetic previous request only" }));
  assert.equal(first.status, 200);
  assert.match(RespondResponseSchema.parse(await first.json()).patientText, /no translated reply/);
  const second = await POST(request(STORIES[3].respondRequest));
  assert.equal(second.status, 200);
  const body = RespondResponseSchema.parse(await second.json());
  assert.deepEqual(body, STORIES[3].respondResponse);
  assert.doesNotMatch(JSON.stringify(body), /previous request/);
});
