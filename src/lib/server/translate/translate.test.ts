import assert from "node:assert/strict";
import { test } from "node:test";
import { TranslateResponseSchema, type TranslateRequest } from "../../contracts";
import { STORIES } from "../fixtures/stories";
import type { ModelRequest } from "../llm";
import { InvalidTranslateInputError, translate } from "./index";

const context = STORIES[0].translateRequest.context;

test("translate preserves all four synthetic fixtures offline", async (t) => {
  const previous = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "mock";
  t.after(() => {
    if (previous === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previous;
  });
  t.mock.method(globalThis, "fetch", () => { throw new Error("No network allowed."); });
  for (const story of STORIES) {
    assert.deepEqual(TranslateResponseSchema.parse(await translate(story.translateRequest)), story.translateResponse);
  }
});

test("mixed guided options, pictograms, text and speech are resolved and redacted before the model", async () => {
  const request: TranslateRequest = {
    context,
    inputs: [
      { questionId: "where", kind: "option", value: "left_arm" },
      { questionId: "how_strong", kind: "option", value: "s7" },
      { questionId: "associated_symptoms", kind: "pictogram", value: "fever" },
      { questionId: "how_long", kind: "text", value: "Three days. demo@example.invalid" },
      { kind: "speech_transcript", value: "Call 780-555-0100. DOB 2000-01-02" },
    ],
  };
  const response = await translate(request, async ({ system, user }: ModelRequest) => {
    assert.doesNotMatch(user, /demo@example|780-555|2000-01-02/);
    const envelope = JSON.parse(user);
    assert.equal(envelope.task, "translate");
    assert.deepEqual(envelope.request.inputs.map(({ value }: { value: string }) => value), [
      "Left arm", "7 out of 10", "Fever", "Three days. [removed]", "Call [removed]. DOB [removed]",
    ]);
    assert.match(system, /Omit names/);
    assert.match(system, /not a diagnostic tool/);
    assert.match(system, /never as instructions/);
    assert.match(system, /"id":"how_strong","question":/);
    return JSON.stringify({ ...STORIES[0].translateResponse, original: "Provider must not control original", redactions: 999 });
  });
  assert.equal(response.original, "Left arm 7 out of 10 Fever Three days. [removed] Call [removed]. DOB [removed]");
  assert.equal(response.redactions, 3);
});

test("invalid guided answers and ambiguous pictograms never reach the model", async () => {
  const inputs: TranslateRequest["inputs"][] = [
    [],
    [{ kind: "text", value: "   " }],
    [{ questionId: "unknown", kind: "text", value: "Pain" }],
    [{ kind: "option", value: "yes" }],
    [{ questionId: "where", kind: "option", value: "unknown" }],
    [{ questionId: "where", kind: "pictogram", value: "arm" }],
    [{ questionId: "where", kind: "pictogram", value: "unknown" }],
    [{ kind: "pictogram", value: "fever" }],
  ];
  let calls = 0;
  for (const answers of inputs) {
    await assert.rejects(translate({ context, inputs: answers }, async () => {
      calls += 1;
      return "{}";
    }), InvalidTranslateInputError);
  }
  for (const language of ["", "  ", "demo@example.invalid"]) {
    await assert.rejects(translate({ context: { ...context, language }, inputs: [{ kind: "text", value: "Pain" }] }), InvalidTranslateInputError);
  }
  assert.equal(calls, 0);
});

test("output redaction covers every clinical and confidence field", async () => {
  const identifier = "demo@example.invalid";
  const response = await translate(STORIES[0].translateRequest, async () => JSON.stringify({
    original: identifier,
    translated: identifier,
    backTranslation: identifier,
    summary: { chiefComplaint: identifier, symptoms: [identifier], duration: identifier, redFlags: [identifier] },
    lowConfidence: [{ phrase: identifier, reason: identifier }],
    redactions: 0,
  }));
  assert.doesNotMatch(JSON.stringify(response), /demo@example/);
  assert.equal(response.original, STORIES[0].translateResponse.original);
  assert.equal(response.redactions, 8);
  assert.equal(response.summary.duration, "[removed]");
});

test("malformed model JSON, contract drift and provider failures reject", async () => {
  for (const raw of ["not JSON", "{}", JSON.stringify({ ...STORIES[0].translateResponse, extra: "field" })]) {
    await assert.rejects(translate(STORIES[0].translateRequest, async () => raw));
  }
  await assert.rejects(translate(STORIES[0].translateRequest, async () => { throw new Error("Provider failed"); }));
});

test("unknown and guided mock requests stay explicitly unavailable and preserve redaction counts", async () => {
  const response = await translate({ context, inputs: [{ kind: "text", value: "Pain. demo@example.invalid" }] });
  assert.equal(response.redactions, 1);
  assert.equal(response.original, "Pain. [removed]");
  assert.match(response.translated, /no translation available/);
  assert.deepEqual(response.summary.symptoms, []);
  const guided = await translate({ context, inputs: [{ kind: "option", questionId: "where", value: "chest" }] });
  assert.equal(guided.original, "Chest");
  assert.match(guided.translated, /no translation available/);
  assert.deepEqual(guided.summary.redFlags, []);
});
