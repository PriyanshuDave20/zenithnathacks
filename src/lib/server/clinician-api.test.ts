import { test } from "node:test";
import assert from "node:assert/strict";
import { protectClinician } from "./clinician-api";

test("clinical API guard rejects cross-site and unsigned requests before reading patient input", async () => {
  let called = 0;
  let checked = 0;
  const handle = protectClinician(async () => { called++; return new Response(null, { status: 204 }); }, {
    origin: () => "https://synapse.example", clinician: async () => { checked++; return null; },
  });
  for (const origin of [undefined, "https://other.example"]) {
    const request = new Request("https://synapse.example/api/translate", { method: "POST", headers: origin ? { origin } : {}, body: "synthetic" });
    const response = await handle(request);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(request.bodyUsed, false);
  }
  assert.equal(checked, 0);
  const request = new Request("https://synapse.example/api/translate", { method: "POST", headers: { origin: "https://synapse.example" }, body: "synthetic" });
  assert.equal((await handle(request)).status, 401);
  assert.equal(request.bodyUsed, false);
  assert.equal(called, 0);
});

test("clinical API guard delegates verified requests and fails closed on session service failure", async () => {
  const request = () => new Request("https://synapse.example/api/respond", { method: "POST", headers: { origin: "https://synapse.example" } });
  let called = 0;
  const handler = async () => { called++; return new Response(null, { status: 204 }); };
  const verified = protectClinician(handler, { origin: () => "https://synapse.example", clinician: async () => ({ id: "synthetic" }) });
  assert.equal((await verified(request())).status, 204);
  const unavailable = protectClinician(handler, { origin: () => "https://synapse.example", clinician: async () => { throw new Error("private detail"); } });
  const response = await unavailable(request());
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("private detail"), false);
  assert.equal(called, 1);
});
