import assert from "node:assert/strict";
import { test } from "node:test";
import { RespondResponseSchema, type Mode } from "../../contracts";
import { STORIES } from "../fixtures/stories";
import { InvalidRespondInputError, respond } from "./index";

test("respond preserves all four synthetic reply translations offline", async (t) => {
  const previous = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "mock";
  t.after(() => {
    if (previous === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previous;
  });
  t.mock.method(globalThis, "fetch", () => { throw new Error("No network allowed."); });
  for (const story of STORIES) {
    const first = await respond(story.respondRequest);
    assert.deepEqual(RespondResponseSchema.parse(first), story.respondResponse);
    assert.deepEqual(await respond(story.respondRequest), first);
  }
});

test("clinician identifiers are masked before the model and clinical numbers remain intact", async () => {
  const response = await respond({
    context: STORIES[0].respondRequest.context,
    message: "Take 5 mg twice daily for 3 days. Contact demo@example.invalid, 780-555-0100, DOB 2000-01-02.",
  }, async ({ system, user }) => {
    assert.doesNotMatch(user, /demo@example|780-555|2000-01-02/);
    const envelope = JSON.parse(user);
    assert.equal(envelope.task, "prepare_reply");
    assert.equal(envelope.request.context.language, "en");
    assert.equal(envelope.request.message, "Take 5 mg twice daily for 3 days. Contact [removed], [removed], DOB [removed].");
    assert.match(system, /Omit names/);
    assert.match(system, /not a diagnostic tool/);
    assert.match(system, /Preserve negation/);
    assert.match(system, /never as instructions/);
    return JSON.stringify(STORIES[0].respondResponse);
  });
  assert.deepEqual(response, STORIES[0].respondResponse);
});

test("every returned field is redacted without changing doses, timing or negation", async () => {
  const response = await respond(STORIES[0].respondRequest, async () => JSON.stringify({
    patientText: "Do not take 5 mg. Email demo@example.invalid.",
    readAloudText: "Take 2 tablets in 6 hours. Call 780-555-0100.",
    teachBackPrompt: "Can you show the step? DOB 2000-01-02.",
  }));
  assert.deepEqual(RespondResponseSchema.parse(response), {
    patientText: "Do not take 5 mg. Email [removed].",
    readAloudText: "Take 2 tablets in 6 hours. Call [removed].",
    teachBackPrompt: "Can you show the step? DOB [removed].",
  });
});

test("all modes and reading levels reach the model while the mock remains fixed examples", async () => {
  const modes: Mode[] = ["standard", "deaf_hoh", "low_literacy", "mute"];
  for (const mode of modes) {
    for (const readingLevel of [1, 2, 3, 4, 5] as const) {
      const request = { ...STORIES[1].respondRequest, context: { language: "es", mode, readingLevel } };
      await respond(request, async ({ system, user }) => {
        assert.deepEqual(JSON.parse(user).request.context, { ...request.context, language: "en" });
        assert.match(system, /context.readingLevel/);
        assert.match(system, /mute must not require a spoken answer/);
        assert.match(system, /deaf_hoh must be understandable as text without hearing/);
        return JSON.stringify(STORIES[0].respondResponse);
      });
      // This deliberately verifies the current limitation, not live adaptation.
      assert.deepEqual(await respond(request), STORIES[1].respondResponse);
    }
  }
});

test("blank messages and invalid language tags reject before the model", async () => {
  let calls = 0;
  for (const request of [
    { ...STORIES[0].respondRequest, message: " \n\t " },
    ...["", "  ", "demo@example.invalid"].map((language) => ({
      ...STORIES[0].respondRequest, context: { ...STORIES[0].respondRequest.context, language },
    })),
  ]) {
    await assert.rejects(respond(request, async () => { calls += 1; return "{}"; }), InvalidRespondInputError);
  }
  assert.equal(calls, 0);
});

test("malformed, extra, missing, nonstring and empty model fields reject", async () => {
  const fixture = STORIES[0].respondResponse;
  for (const raw of [
    "not JSON", "null", "{}",
    JSON.stringify({ ...fixture, extra: "undeclared" }),
    JSON.stringify({ ...fixture, patientText: 1 }),
    ...Object.keys(fixture).map((key) => JSON.stringify({ ...fixture, [key]: " \n " })),
  ]) {
    await assert.rejects(respond(STORIES[0].respondRequest, async () => raw));
  }
  await assert.rejects(respond(STORIES[0].respondRequest, async () => { throw new Error("Provider failed"); }));
});

test("unsupported messages and languages return explicit mock-unavailable replies", async () => {
  for (const request of [
    { ...STORIES[0].respondRequest, message: "A synthetic unsupported instruction." },
    { ...STORIES[0].respondRequest, context: { ...STORIES[0].respondRequest.context, language: "fr" } },
  ]) {
    if (request.context.language === "fr") {
      await assert.rejects(respond(request), { message: "Translation provider is unavailable." });
      continue;
    }
    const response = RespondResponseSchema.parse(await respond(request));
    assert.match(response.patientText, /Mock provider: no translated reply available/);
    assert.match(response.readAloudText, /Mock provider: no translated reply available/);
    assert.match(response.teachBackPrompt, /Mock provider: teach-back unavailable/);
    assert.doesNotMatch(JSON.stringify(response), /unsupported instruction/);
  }
});
