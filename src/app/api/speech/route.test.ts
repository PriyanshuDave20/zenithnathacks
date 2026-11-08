import assert from "node:assert/strict";
import { test } from "node:test";
import { GET, POST } from "./route";

test("speech capabilities and disabled route expose no secrets and never cache", async t => {
  const old = process.env.SPEECH_PROVIDER; process.env.SPEECH_PROVIDER = "browser";
  t.after(() => { if (old === undefined) delete process.env.SPEECH_PROVIDER; else process.env.SPEECH_PROVIDER = old; });
  const capabilities = GET();
  assert.deepEqual(await capabilities.json(), { provider: "browser" });
  assert.equal(capabilities.headers.get("Cache-Control"), "no-store");
  const response = await POST(new Request("https://synapse.test/api/speech", { method: "POST", body: JSON.stringify({ text: "Please wait.", language: "en" }) }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("speech route validates shape, locale and body size before any provider call", async t => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected provider call"); });
  for (const body of ["invalid-json", JSON.stringify({ text: "Please wait.", language: "en", extra: "value" }), JSON.stringify({ text: "", language: "ar" }), JSON.stringify({ text: "Please wait.", language: "yue-HK" })]) {
    const response = await POST(new Request("https://synapse.test/api/speech", { method: "POST", body }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  const response = await POST(new Request("https://synapse.test/api/speech", { method: "POST", body: "a".repeat(20_000) }));
  assert.equal(response.status, 413);
});

test("speech route returns MPEG audio only and generic no-store provider failures", async t => {
  for (const [key, value] of Object.entries({ SPEECH_PROVIDER: "azure", AZURE_SPEECH_KEY: "synthetic-key", AZURE_SPEECH_REGION: "canadacentral" })) {
    const old = process.env[key]; process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
  assert.deepEqual(await GET().json(), { provider: "azure" });
  let fail = false;
  t.mock.method(globalThis, "fetch", async () => fail ? new Response("synthetic-secret", { status: 500 }) : new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } }));
  const request = () => new Request("https://synapse.test/api/speech", { method: "POST", body: JSON.stringify({ text: "请稍候。", language: "zh-Hans" }) });
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.arrayBuffer()).byteLength, 3);
  fail = true;
  const error = await POST(request());
  assert.equal(error.status, 502);
  assert.doesNotMatch(await error.text(), /synthetic-secret/);
});
