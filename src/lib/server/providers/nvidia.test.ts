import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { callModel } from "../llm";
import { NVIDIA_MODEL } from "./nvidia";

const request = { system: "Return JSON. Synthetic demo only.", user: "A synthetic non-identifying example." };
function configure(t: TestContext) {
  const names = ["LLM_PROVIDER", "LLM_MODEL", "NVIDIA_API_KEY", "NVIDIA_BASE_URL"];
  const previous = names.map((name) => process.env[name]);
  process.env.LLM_PROVIDER = "nvidia";
  process.env.NVIDIA_API_KEY = "synthetic-test-key";
  delete process.env.LLM_MODEL;
  delete process.env.NVIDIA_BASE_URL;
  t.after(() => names.forEach((name, i) => {
    if (previous[i] === undefined) delete process.env[name];
    else process.env[name] = previous[i];
  }));
}
const completion = (content = '{"example":"translated"}', finish_reason = "stop") => ({
  choices: [{ finish_reason, message: { content, reasoning_content: "Do not expose internal reasoning." } }],
});

test("NVIDIA uses native nonstreaming HTTPS JSON with private server credentials and bounded latency", async (t) => {
  configure(t);
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(String(url), "https://integrate.api.nvidia.com/v1/chat/completions");
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "omit");
    assert.equal(init.redirect, "error");
    assert.ok(init.signal);
    const headers = new Headers(init.headers);
    assert.equal(headers.get("Authorization"), "Bearer synthetic-test-key");
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, NVIDIA_MODEL);
    assert.equal(body.stream, false);
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
    assert.match(body.messages[0].content, /Omit names, IDs/);
    assert.equal(body.messages[1].content, request.user);
    assert.doesNotMatch(String(init.body), /synthetic-test-key/);
    return Response.json(completion());
  });
  assert.equal(await callModel(request), '{"example":"translated"}');
});

test("NVIDIA rejects missing credentials and unsafe configuration before network calls", async (t) => {
  configure(t);
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network"); });
  delete process.env.NVIDIA_API_KEY;
  await assert.rejects(callModel(request), { message: "Translation provider is unavailable." });
  process.env.NVIDIA_API_KEY = "synthetic-test-key";
  for (const base of ["http://example.invalid/v1", "https://user:password@example.invalid/v1", "not a URL"]) {
    process.env.NVIDIA_BASE_URL = base;
    await assert.rejects(callModel(request), { message: "Translation provider is unavailable." });
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("NVIDIA never exposes upstream errors, malformed JSON, refusal, truncation or reasoning", async (t) => {
  configure(t);
  for (const response of [
    new Response("synthetic-test-key private body", { status: 401 }),
    new Response("private error", { status: 429 }),
    new Response("not JSON"),
    Response.json({ choices: [] }),
    Response.json(completion("", "stop")),
    Response.json(completion("{}", "length")),
    Response.json(completion("<think>private reasoning</think>{}")),
    Response.json(completion("```json\n{}\n```")),
  ]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => response.clone());
    await assert.rejects(callModel(request), (error: Error) => {
      assert.equal(error.message, "Translation provider is unavailable.");
      assert.equal(error.cause, undefined);
      return true;
    });
    assert.equal(fetch.mock.callCount(), 1); // No automatic retries that could duplicate content/cost.
    fetch.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new Error("synthetic-test-key private transport error"); });
  await assert.rejects(callModel(request), { message: "Translation provider is unavailable." });
});

test("NVIDIA accepts an explicit HTTPS API base and served model from server configuration", async (t) => {
  configure(t);
  process.env.NVIDIA_BASE_URL = "https://nim.example.invalid/v1";
  process.env.LLM_MODEL = "synthetic-served-model";
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(String(url), "https://nim.example.invalid/v1/chat/completions");
    assert.equal(JSON.parse(String(init.body)).model, "synthetic-served-model");
    return Response.json(completion());
  });
  await callModel(request);
});

test("NVIDIA honors the caller's shared pipeline cancellation without exposing its reason", async (t) => {
  configure(t);
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", (_url: URL, init: RequestInit) => new Promise((_resolve, reject) => {
    assert.ok(init.signal);
    init.signal.addEventListener("abort", () => reject(new Error("Synthetic private cancellation")), { once: true });
    controller.abort("Synthetic private reason");
  }));
  await assert.rejects(callModel({ ...request, signal: controller.signal }), { message: "Translation provider is unavailable." });
});
