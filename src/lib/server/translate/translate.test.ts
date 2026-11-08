import assert from "node:assert/strict";
import { test } from "node:test";
import { TranslateResponseSchema, type TranslateRequest, type TranslateResponse } from "../../contracts";
import { STORIES } from "../fixtures/stories";
import type { ModelRequest } from "../llm";
import { InvalidTranslateInputError, translate } from "./index";
import { GUIDED_LANGUAGES, getLanguagePack } from "../../questions/localization";

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

test("mixed input sends only redacted free text/speech to the model and combines the deterministic guided report", async () => {
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
      "Three days. [removed]", "Call [removed]. DOB [removed]",
    ]);
    assert.match(system, /Omit names/);
    assert.match(system, /not a diagnostic tool/);
    assert.match(system, /never as instructions/);
    assert.doesNotMatch(user, /Left arm|7 out of 10|Fever/);
    assert.match(system, /"id":"how_long","question":/);
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

test("unknown free text remains unavailable in mock mode while guided input produces a local report", async () => {
  const response = await translate({ context, inputs: [{ kind: "text", value: "Pain. demo@example.invalid" }] });
  assert.equal(response.redactions, 1);
  assert.equal(response.original, "Pain. [removed]");
  assert.match(response.translated, /no translation available/);
  assert.deepEqual(response.summary.symptoms, []);
  const guided = await translate({ context, inputs: [{ kind: "option", questionId: "where", value: "chest" }] });
  assert.equal(guided.original, "Chest");
  assert.equal(guided.translated, "Location: Chest");
  assert.deepEqual(guided.summary.redFlags, []);
});

test("pure guided reports work with NVIDIA selected and no key, with zero model/network calls", async (t) => {
  const previousProvider = process.env.LLM_PROVIDER;
  const previousKey = process.env.NVIDIA_API_KEY;
  process.env.LLM_PROVIDER = "nvidia";
  delete process.env.NVIDIA_API_KEY;
  t.after(() => {
    if (previousProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = previousKey;
  });
  t.mock.method(globalThis, "fetch", () => { throw new Error("No network for guided input"); });
  const result = await translate({ context, inputs: [
    { kind: "option", questionId: "where", value: "right_knee" },
    { kind: "option", questionId: "how_strong", value: "s8" },
    { kind: "option", questionId: "associated_symptoms", value: "none" },
    { kind: "option", questionId: "red_flags", value: "none" },
  ] }, async () => { throw new Error("No model for guided input"); });
  assert.equal(result.summary.chiefComplaint, "Reported location: Right knee");
  assert.match(result.translated, /Severity: 8 out of 10/);
  assert.match(result.translated, /Associated symptoms: Nothing else/);
  assert.match(result.translated, /Red flags: None of these/);
  assert.deepEqual(result.summary.redFlags, []);
  assert.doesNotMatch(result.translated, /diagnosis/i);
});

test("free-text answers inside guided questions still call the model; arbitrary text never uses the pack", async () => {
  let calls = 0;
  await translate({ context, inputs: [{ questionId: "where", kind: "text", value: "My knee hurts." }] }, async ({ user }) => {
    calls += 1;
    assert.equal(JSON.parse(user).request.inputs[0].value, "My knee hurts.");
    return JSON.stringify(STORIES[0].translateResponse);
  });
  assert.equal(calls, 1);
});

test("guided reports flag only explicitly selected red-flag answers and do not infer from locations", async () => {
  const response = await translate({ context, inputs: [
    { questionId: "where", kind: "option", value: "chest" },
    { questionId: "red_flags", kind: "option", value: "short_breath" },
    { questionId: "red_flags", kind: "option", value: "unsure" },
  ] });
  assert.deepEqual(response.summary.redFlags, ["Trouble breathing"]);
  assert.match(response.translated, /Not sure/);
});

test("every shipped language produces the same deterministic English report and localized read-back with no model", async () => {
  const inputs: TranslateRequest["inputs"] = [
    { questionId: "where", kind: "option", value: "left_knee" },
    { questionId: "how_strong", kind: "option", value: "s6" },
    { questionId: "associated_symptoms", kind: "option", value: "none" },
  ];
  let english: TranslateResponse | undefined;
  for (const language of GUIDED_LANGUAGES) {
    const pack = getLanguagePack(language);
    assert.ok(pack, `Missing static pack for ${language}`);
    const result = await translate({ context: { ...context, language }, inputs }, async () => { throw new Error("No model for cached choices"); });
    if (!english) english = result;
    assert.deepEqual(result.summary, english.summary);
    assert.equal(result.translated, english.translated);
    assert.ok(result.backTranslation.includes(pack.questions.how_strong.options.s6));
  }
});

test("fixed tap-phrases are deterministic IDs, with only additional typed text sent to the model", async () => {
  const inputs: TranslateRequest["inputs"] = [
    { questionId: "chief_complaint", kind: "option", value: "phrase:pain" },
    { questionId: "chief_complaint", kind: "option", value: "phrase:head" },
  ];
  const result = await translate({ context, inputs }, async () => { throw new Error("No model for tap phrases"); });
  assert.equal(result.original, "Pain in my head");
  await translate({ context, inputs: [...inputs, { kind: "text", value: "It began today." }] }, async ({ user }) => {
    assert.deepEqual(JSON.parse(user).request.inputs, [{ kind: "text", value: "It began today." }]);
    return JSON.stringify(STORIES[0].translateResponse);
  });
});

test("an uncached guided language fails explicitly instead of generating translations or pretending to localize", async () => {
  let calls = 0;
  await assert.rejects(translate({ context: { ...context, language: "fr" }, inputs: [
    { questionId: "where", kind: "option", value: "head" },
  ] }, async () => { calls += 1; return "{}"; }), InvalidTranslateInputError);
  assert.equal(calls, 0);
});

test("nonclinical speech keeps its translation when the model represents absent duration as null", async () => {
  const result = await translate({
    context: { ...context, language: "es" },
    inputs: [{ kind: "speech_transcript", value: "Dónde está la biblioteca" }],
  }, async ({ system }) => {
    assert.match(system, /Translate nonclinical questions/);
    assert.match(system, /omit summary.duration/);
    return JSON.stringify({
      original: "Dónde está la biblioteca", translated: "Where is the library?", backTranslation: "¿Dónde está la biblioteca?",
      summary: { chiefComplaint: "Not stated", symptoms: [], duration: null, redFlags: [] },
      lowConfidence: [], redactions: 0,
    });
  });
  assert.equal(result.translated, "Where is the library?");
  assert.deepEqual(result.summary, { chiefComplaint: "Not stated", symptoms: [], redFlags: [] });
  assert.equal(Object.hasOwn(result.summary, "duration"), false);
  TranslateResponseSchema.parse(result);
});

test("absent-duration normalization keeps valid durations and rejects other invalid provider fields", async () => {
  const base = { ...STORIES[0].translateResponse, summary: { chiefComplaint: "Not stated", symptoms: [], redFlags: [] } };
  for (const duration of [123, false, [], {}]) {
    await assert.rejects(translate(STORIES[0].translateRequest, async () => JSON.stringify({
      ...base, summary: { ...base.summary, duration },
    })));
  }
  for (const summary of [null, { ...base.summary, chiefComplaint: null }, { ...base.summary, symptoms: null }]) {
    await assert.rejects(translate(STORIES[0].translateRequest, async () => JSON.stringify({ ...base, summary })));
  }
  const valid = await translate(STORIES[0].translateRequest, async () => JSON.stringify({
    ...base, summary: { ...base.summary, duration: "2 days" },
  }));
  assert.equal(valid.summary.duration, "2 days");
});
