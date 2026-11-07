import assert from "node:assert/strict";
import { test } from "node:test";
import { RespondResponseSchema, TranslateResponseSchema } from "../contracts";
import { STORIES } from "./fixtures/stories";
import { callModel } from "./llm";

const system = "Use only this synthetic demo. Omit identifiers. Return strict JSON. Do not diagnose.";

test("default mock needs no key, makes no network request, and is deterministic", async (t) => {
  const previousProvider = process.env.LLM_PROVIDER;
  delete process.env.LLM_PROVIDER;
  t.after(() => {
    if (previousProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previousProvider;
  });
  t.mock.method(globalThis, "fetch", () => { throw new Error("Network use is forbidden in mock tests."); });
  for (const story of STORIES) {
    const translate = { system, user: JSON.stringify({ task: "translate", request: story.translateRequest }) };
    const first = await callModel(translate);
    assert.equal(await callModel(translate), first);
    assert.deepEqual(TranslateResponseSchema.parse(JSON.parse(first)), story.translateResponse);
    const reply = await callModel({ system, user: JSON.stringify({ task: "respond", request: story.respondRequest }) });
    assert.deepEqual(RespondResponseSchema.parse(JSON.parse(reply)), story.respondResponse);
  }
});

test("explicit mock ignores LLM_MODEL and supports each mode and reading level", async (t) => {
  const previousProvider = process.env.LLM_PROVIDER;
  const previousModel = process.env.LLM_MODEL;
  process.env.LLM_PROVIDER = "mock";
  process.env.LLM_MODEL = "unused-test-model";
  t.after(() => {
    if (previousProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previousProvider;
    if (previousModel === undefined) delete process.env.LLM_MODEL;
    else process.env.LLM_MODEL = previousModel;
  });
  for (const mode of ["standard", "deaf_hoh", "low_literacy", "mute"]) {
    for (const readingLevel of [1, 2, 3, 4, 5]) {
      const request = { ...STORIES[0].respondRequest, context: { language: "en", mode, readingLevel } };
      const response = await callModel({ system, user: JSON.stringify({ task: "respond", request }) });
      assert.deepEqual(RespondResponseSchema.parse(JSON.parse(response)), STORIES[0].respondResponse);
    }
  }
});

test("unknown input is redacted and never gets an invented clinical summary", async () => {
  const request = {
    context: STORIES[0].translateRequest.context,
    inputs: [{ kind: "text", value: "Contact demo@example.invalid on 2000-01-02 at 780-555-0100." }],
  };
  const raw = await callModel({ system, user: JSON.stringify({ task: "translate", request }) });
  const response = TranslateResponseSchema.parse(JSON.parse(raw));
  assert.equal(response.redactions, 3);
  assert.equal(response.original, "Contact [removed] on [removed] at [removed].");
  assert.deepEqual(response.summary.symptoms, []);
  assert.deepEqual(response.summary.redFlags, []);
  assert.match(response.lowConfidence[0].reason, /no translation was performed/);
  assert.doesNotMatch(raw, /demo@example|2000-01-02|780-555/);
});

test("guided input and unsupported reply/language return explicit mock placeholders", async () => {
  const request = { context: { language: "fr", mode: "mute", readingLevel: 3 }, inputs: [{ questionId: "where", kind: "option", value: "chest" }] };
  const translation = await callModel({ system, user: JSON.stringify({ task: "translate", request }) });
  assert.match(TranslateResponseSchema.parse(JSON.parse(translation)).translated, /Mock provider/);
  const reply = await callModel({ system, user: JSON.stringify({ task: "respond", request: { context: request.context, message: "Unknown reply" } }) });
  assert.match(RespondResponseSchema.parse(JSON.parse(reply)).patientText, /no translated reply/);
});

test("ordinary text prompts return deterministic canned text without echoing input", async () => {
  const first = await callModel({ system, user: "A synthetic prompt." });
  const second = await callModel({ system, user: "A different synthetic prompt." });
  assert.equal(first, second);
  assert.match(first, /Mock provider/);
  assert.doesNotMatch(first, /synthetic prompt/);
});

test("invalid tasks and unknown providers fail without exposing content", async (t) => {
  for (const user of [JSON.stringify({ task: "unknown", request: "secret" }), JSON.stringify({ task: "respond", request: {} })]) {
    await assert.rejects(callModel({ system, user }), { message: "Mock provider expects a valid translate or respond task." });
  }
  const previousProvider = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "secret-unconfigured-provider";
  t.after(() => {
    if (previousProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previousProvider;
  });
  await assert.rejects(callModel({ system, user: "secret" }), {
    message: "LLM provider is not configured. Only the mock provider is available.",
  });
});
