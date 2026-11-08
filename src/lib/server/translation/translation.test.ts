import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { STORIES } from "../fixtures/stories";
import { translateAzureTexts, translateTexts, translationLanguage } from "./index";
import { translate } from "../translate";
import { respond } from "../respond";
import { POST as translateRoute } from "../../../app/api/translate/route";
import { POST as respondRoute } from "../../../app/api/respond/route";

function environment(t: TestContext, values: Record<string, string | undefined>) {
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}
const output = (text: string, to = "en") => [{ translations: [{ text, to }] }];

test("translation locales normalize regional Arabic/Spanish/English and Chinese scripts", () => {
  for (const [input, expected] of [["ar-SA", "ar"], ["es-MX", "es"], ["en-CA", "en"], ["zh-CN", "zh-Hans"], ["zh-TW", "zh-Hant"], ["zh-Hans", "zh-Hans"], ["fr-CA", "fr-CA"], ["pt-PT", "pt-PT"], ["pt-BR", "pt"], ["hi-IN", "hi"], ["sr-Cyrl-RS", "sr-Cyrl"]]) {
    assert.equal(translationLanguage(input), expected);
  }
  for (const input of ["", "invalid@tag", "x".repeat(150)]) assert.throws(() => translationLanguage(input));
});

test("Azure translates synthetic Arabic/Chinese/Spanish using fixed HTTPS JSON without a model SDK", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: "azure", AZURE_TRANSLATOR_KEY: "synthetic-key", AZURE_TRANSLATOR_REGION: "canadacentral" });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    calls++;
    assert.equal(url.origin, "https://api.cognitive.microsofttranslator.com");
    assert.equal(url.pathname, "/translate");
    assert.equal(url.searchParams.get("api-version"), "3.0");
    assert.equal(url.searchParams.get("to"), "en");
    assert.equal(url.searchParams.get("textType"), "plain");
    assert.equal(init.method, "POST");
    assert.equal(init.cache, "no-store"); assert.equal(init.credentials, "omit"); assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    const headers = new Headers(init.headers);
    assert.equal(headers.get("Ocp-Apim-Subscription-Key"), "synthetic-key");
    assert.equal(headers.get("Ocp-Apim-Subscription-Region"), "canadacentral");
    const body = JSON.parse(String(init.body));
    const story = STORIES.find((item) => item.translateResponse.original === body[0].Text)!;
    return Response.json(output(story.translateResponse.translated));
  });
  for (const story of STORIES.slice(1)) {
    const result = await translateTexts({ texts: [story.translateResponse.original], from: story.translateRequest.context.language, to: "en" });
    assert.deepEqual(result, { texts: [story.translateResponse.translated], redactions: 0, mock: false });
  }
  assert.equal(calls, 3);
});

test("Azure masks input and output identifiers at each boundary and preserves clinical quantities", async (t) => {
  environment(t, { AZURE_TRANSLATOR_KEY: "synthetic-key", AZURE_TRANSLATOR_REGION: "global" });
  t.mock.method(globalThis, "fetch", async (_url: URL, init: RequestInit) => {
    assert.equal(new Headers(init.headers).has("Ocp-Apim-Subscription-Region"), false);
    assert.deepEqual(JSON.parse(String(init.body)), [{ Text: "No fever. 5 mg for 3 days. [removed]" }]);
    return Response.json(output("No fever. Left knee. 5 mg for 3 days. 780-555-0100.", "es"));
  });
  const result = await translateAzureTexts({ texts: ["No fever. 5 mg for 3 days. demo@example.invalid"], from: "en", to: "es" });
  assert.deepEqual(result, { texts: ["No fever. Left knee. 5 mg for 3 days. [removed]."], redactions: 2, mock: false });
});

test("Azure rejects HTTP failures, malformed JSON, wrong targets, missing/extra/empty items generically without logs", async (t) => {
  environment(t, { AZURE_TRANSLATOR_KEY: "synthetic-key" });
  const logs = ["log", "warn", "error", "debug", "info"].map((method) => t.mock.method(console, method as "log", () => {}));
  for (const response of [new Response("synthetic-private-error", { status: 429 }), new Response("synthetic-private-json"),
    Response.json([]), Response.json(output("Text", "de")), Response.json(output(" ")), Response.json([...output("A"), ...output("B")]),
    Response.json([{ translations: [] }]), Response.json({ text: "synthetic-private" })]) {
    const fetchMock = t.mock.method(globalThis, "fetch", async () => response.clone());
    await assert.rejects(translateAzureTexts({ texts: ["Synthetic input"], from: "en", to: "ar" }), { message: "Translation provider is unavailable." });
    fetchMock.mock.restore();
  }
  assert.ok(logs.every((log) => log.mock.callCount() === 0));
});

test("offline translation is independent of NVIDIA settings and never invents unknown foreign translations", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: undefined, LLM_PROVIDER: "nvidia", AZURE_TRANSLATOR_KEY: undefined });
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("No network in offline translator"); });
  assert.deepEqual((await translateTexts({ texts: [STORIES[2].translateResponse.original], from: "ar", to: "en" })).texts, [STORIES[2].translateResponse.translated]);
  await assert.rejects(translateTexts({ texts: ["نص تجريبي غير معروف"], from: "ar", to: "en" }), { message: "Translation provider is unavailable." });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("same-language identity needs no Azure key; invalid provider/config/bounds fail before fetch", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: "azure", AZURE_TRANSLATOR_KEY: undefined });
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Must not fetch"); });
  assert.deepEqual(await translateTexts({ texts: ["No pain. 7/10. 2 days."], from: "en-US", to: "en" }), { texts: ["No pain. 7/10. 2 days."], redactions: 0, mock: false });
  for (const request of [{ texts: ["Test"], from: "en", to: "ar" }, { texts: [], from: "en", to: "ar" },
    { texts: [" "] , from: "en", to: "ar" }, { texts: ["A".repeat(20001)], from: "en", to: "ar" }, { texts: ["Test"], from: "bad@tag", to: "ar" }]) {
    await assert.rejects(translateTexts(request), { message: "Translation provider is unavailable." });
  }
  process.env.TRANSLATION_PROVIDER = "synthetic-unknown-provider";
  await assert.rejects(translateTexts({ texts: ["Test"], from: "en", to: "en" }), { message: "Translation provider is unavailable." });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("Azure request cancellation reaches the HTTP transport and returns a generic error", async (t) => {
  environment(t, { AZURE_TRANSLATOR_KEY: "synthetic-key" });
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", (_url: URL, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal!.addEventListener("abort", () => reject(new Error("Synthetic private abort detail")), { once: true });
    controller.abort();
  }));
  await assert.rejects(translateAzureTexts({ texts: ["Test"], from: "en", to: "ar", signal: controller.signal }), { message: "Translation provider is unavailable." });
});

test("Azure-to-English pipeline keeps foreign source, guided choices and identifiers out of Nemotron", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: "azure", AZURE_TRANSLATOR_KEY: "synthetic-key" });
  const source = "أحتاج إلى مساعدة. demo@example.invalid";
  const english = "No fever. Left knee pain for 3 days. 7 out of 10.";
  const endpoints: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    const to = url.searchParams.get("to")!; endpoints.push(to);
    const values = JSON.parse(String(init.body)) as { Text: string }[];
    if (to === "en") {
      assert.deepEqual(values, [{ Text: "أحتاج إلى مساعدة. [removed]" }]);
      return Response.json(output(english));
    }
    assert.deepEqual(values, [{ Text: english }]);
    return Response.json(output("أحتاج إلى مساعدة.", "ar"));
  });
  const result = await translate({ context: { language: "ar", mode: "standard", readingLevel: 3 }, inputs: [
    { questionId: "where", kind: "option", value: "right_arm" }, { kind: "speech_transcript", value: source },
  ] }, async ({ user, system, signal }) => {
    const request = JSON.parse(user);
    assert.equal(request.task, "summarize"); assert.equal(request.request.context.language, "en");
    assert.deepEqual(request.request.inputs, [{ kind: "speech_transcript", value: english }]);
    assert.doesNotMatch(user, /أحتاج|demo@example|right_arm/);
    assert.match(system, /structured English summary/); assert.ok(signal);
    return JSON.stringify({ summary: { chiefComplaint: "Left knee pain", symptoms: ["No fever"], duration: "3 days", redFlags: [] }, lowConfidence: [] });
  });
  assert.deepEqual(endpoints, ["en", "ar"]);
  assert.match(result.original, /\[removed\]/); assert.equal(result.redactions, 1);
  assert.match(result.translated, /Location: Right arm/); assert.match(result.translated, /No fever\. Left knee pain for 3 days\. 7 out of 10/);
  assert.equal(result.summary.duration, "3 days");
});

test("reply preparation stays English and masks model output before Azure, preserving mode/level", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: "azure", AZURE_TRANSLATOR_KEY: "synthetic-key" });
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.searchParams.get("from"), "en"); assert.equal(url.searchParams.get("to"), "zh-Hans");
    assert.doesNotMatch(String(init.body), /demo@example/);
    assert.match(String(init.body), /Do not take 5 mg for 3 days/);
    return Response.json(["请勿服药。", "请勿服药。", "请指出该怎么做。"].map((text) => ({ translations: [{ text, to: "zh-Hans" }] })));
  });
  const result = await respond({ context: { language: "zh-Hans", mode: "mute", readingLevel: 1 }, message: "Do not take 5 mg for 3 days." }, async ({ user, signal }) => {
    assert.deepEqual(JSON.parse(user).request.context, { language: "en", mode: "mute", readingLevel: 1 }); assert.ok(signal);
    return JSON.stringify({ patientText: "Do not take 5 mg for 3 days. demo@example.invalid", readAloudText: "Do not take 5 mg for 3 days.", teachBackPrompt: "Please point to the step." });
  });
  assert.equal(result.patientText, "请勿服药。"); assert.equal(result.teachBackPrompt, "请指出该怎么做。");
});

test("pure guided requests ignore invalid provider configuration; failed Azure never falls back to Nemotron", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: "invalid", LLM_PROVIDER: "invalid" });
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("No fetch"); });
  const guided = await translate({ context: { language: "ar", mode: "standard", readingLevel: 3 }, inputs: [{ questionId: "where", kind: "option", value: "left_knee" }] });
  assert.match(guided.translated, /Left knee/); assert.equal(fetchMock.mock.callCount(), 0);
  process.env.TRANSLATION_PROVIDER = "azure";
  let modelCalls = 0;
  await assert.rejects(translate(STORIES[2].translateRequest, async () => { modelCalls++; return "{}"; }));
  assert.equal(modelCalls, 0);
});

test("both routes keep Azure errors generic and no-store without retaining the previous request", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: "azure", AZURE_TRANSLATOR_KEY: "synthetic-key", LLM_PROVIDER: "mock" });
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("synthetic-private-error", { status: 401 }));
  for (const [route, fixture] of [[translateRoute, STORIES[2].translateRequest], [respondRoute, STORIES[2].respondRequest]] as const) {
    const response = await route(new Request("http://synapse.test/api", { method: "POST", body: JSON.stringify(fixture) }));
    assert.equal(response.status, 502); assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.doesNotMatch(await response.text(), /synthetic-private/);
  }
  fetchMock.mock.restore();
  process.env.TRANSLATION_PROVIDER = "mock";
  const next = await translate(STORIES[0].translateRequest);
  assert.deepEqual(next, STORIES[0].translateResponse);
});

test("translate route propagates browser cancellation and all pipeline stages share one deadline", async (t) => {
  environment(t, { TRANSLATION_PROVIDER: "azure", AZURE_TRANSLATOR_KEY: "synthetic-key", LLM_PROVIDER: "mock" });
  const controller = new AbortController();
  const fetchMock = t.mock.method(globalThis, "fetch", (_url: URL, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal!.addEventListener("abort", () => reject(new Error("Synthetic private abort")), { once: true });
    controller.abort();
  }));
  const response = await translateRoute(new Request("http://synapse.test/api/translate", {
    method: "POST", body: JSON.stringify(STORIES[2].translateRequest), signal: controller.signal,
  }));
  assert.equal(response.status, 502); assert.equal(response.headers.get("Cache-Control"), "no-store");
  fetchMock.mock.restore();
  const stages: AbortSignal[] = [];
  await translate(STORIES[2].translateRequest, async ({ signal }) => {
    stages.push(signal!);
    return JSON.stringify({ summary: STORIES[2].translateResponse.summary, lowConfidence: [] });
  }, async ({ texts, from, signal }) => {
    stages.push(signal!);
    return { texts: from === "en" ? [STORIES[2].translateResponse.original] : texts.map(() => STORIES[2].translateResponse.translated), redactions: 0, mock: false };
  });
  assert.equal(stages.length, 3); assert.ok(stages.every((signal) => signal === stages[0]));
});
