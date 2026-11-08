import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { azureSpeechAvailable, speechVoice, synthesizeSpeech } from "./index";

function configure(t: TestContext) {
  for (const [key, value] of Object.entries({ SPEECH_PROVIDER: "azure", AZURE_SPEECH_KEY: "synthetic-key", AZURE_SPEECH_REGION: "canadacentral" })) {
    const old = process.env[key]; process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
}

test("Azure prebuilt voices map all app languages and exclude unrelated Chinese dialects", () => {
  assert.equal(speechVoice("ar-SA")?.name, "ar-SA-ZariyahNeural");
  assert.equal(speechVoice("zh-Hans")?.name, "zh-CN-XiaoxiaoNeural");
  assert.equal(speechVoice("zh-CN")?.name, "zh-CN-XiaoxiaoNeural");
  assert.equal(speechVoice("es-MX")?.language, "es-ES");
  assert.equal(speechVoice("en-CA")?.language, "en-US");
  for (const unsupported of ["yue-HK", "zh-HK", "zh-Hant-TW", "invalid locale", "de"]) assert.equal(speechVoice(unsupported), undefined);
});

test("Azure synthesis redacts identifiers, escapes SSML and uses bounded no-store requests", async t => {
  configure(t);
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    assert.equal(input, "https://canadacentral.tts.speech.microsoft.com/cognitiveservices/v1");
    assert.equal(init.cache, "no-store"); assert.equal(init.credentials, "omit"); assert.equal(init.redirect, "error");
    assert.ok(init.signal);
    const headers = new Headers(init.headers);
    assert.equal(headers.get("X-Microsoft-OutputFormat"), "audio-24khz-48kbitrate-mono-mp3");
    assert.equal(headers.get("User-Agent"), "Synapse-Synthetic-Demo");
    assert.match(String(init.body), /&lt;break\/&gt; &amp;/);
    assert.match(String(init.body), /\[removed\]/);
    assert.doesNotMatch(String(init.body), /780-555-0100/);
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });
  });
  assert.deepEqual(await synthesizeSpeech("<break/> & Call 780-555-0100.", "en"), new Uint8Array([1, 2, 3]));
});

test("disabled, invalid region and oversized input never make a speech request", async t => {
  configure(t);
  t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected network"); });
  process.env.AZURE_SPEECH_REGION = "other.example/path";
  assert.equal(azureSpeechAvailable(), false);
  await assert.rejects(synthesizeSpeech("Please wait.", "en"), { message: "Speech is unavailable." });
  process.env.AZURE_SPEECH_REGION = "canadacentral";
  await assert.rejects(synthesizeSpeech("a".repeat(2001), "en"), { message: "Speech is unavailable." });
  process.env.SPEECH_PROVIDER = "browser";
  await assert.rejects(synthesizeSpeech("Please wait.", "en"), { message: "Speech is unavailable." });
});

test("invalid, empty, rate-limited and failed audio responses fail without exposing provider detail", async t => {
  configure(t);
  for (const response of [new Response("synthetic-secret", { status: 429 }), new Response("synthetic-secret"), new Response(null, { headers: { "Content-Type": "audio/mpeg" } })]) {
    const mock = t.mock.method(globalThis, "fetch", async () => response.clone());
    await assert.rejects(synthesizeSpeech("Please wait.", "en"), { message: "Speech is unavailable." });
    mock.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new Error("synthetic-private-provider-detail"); });
  await assert.rejects(synthesizeSpeech("Please wait.", "en"), { message: "Speech is unavailable." });
});
