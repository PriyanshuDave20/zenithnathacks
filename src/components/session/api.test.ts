import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { POST as translateRoute } from "../../app/api/translate/route";
import { POST as respondRoute } from "../../app/api/respond/route";
import { STORIES } from "../../lib/server/fixtures/stories";
import { BODY_PARTS } from "../../lib/input/body-parts";
import { getGuidedQuestions } from "../../lib/questions/localization";
import { isReplyUnavailable, respond, track, translate } from "./api";

function connectRoutes(t: TestContext) {
  const previous = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "mock";
  t.after(() => {
    if (previous === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previous;
  });
  const requests: Request[] = [];
  t.mock.method(globalThis, "fetch", async (path: string, init: RequestInit) => {
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "omit");
    assert.ok(init.signal);
    const request = new Request(`http://synapse.test${path}`, init);
    requests.push(request.clone());
    if (path === "/api/translate") return translateRoute(request);
    if (path === "/api/respond") return respondRoute(request);
    throw new Error("Unexpected API path.");
  });
  return requests;
}

test("browser adapter reaches both real routes for all four synthetic fixtures", async (t) => {
  const requests = connectRoutes(t);
  for (const story of STORIES) {
    assert.deepEqual(await translate(story.translateRequest), story.translateResponse);
    const reply = await respond(story.respondRequest);
    assert.deepEqual(reply, story.respondResponse);
    assert.equal(isReplyUnavailable(reply), false);
  }
  assert.equal(requests.length, 8);
});

test("every frontend guided option and body part reaches the route without losing its label or scale", async (t) => {
  const requests = connectRoutes(t);
  const questions = getGuidedQuestions("en")!;
  const inputs = questions.flatMap((question) => question.options.map((option) => ({
    questionId: question.id, kind: "option" as const, value: option.id,
  })));
  inputs.push(...BODY_PARTS.map((part) => ({ questionId: "where", kind: "option" as const, value: part.id })));
  const response = await translate({ context: STORIES[0].translateRequest.context, inputs });
  const expected = [
    ...questions.flatMap((question) => question.options.map((option) => option.label)),
    ...BODY_PARTS.map((part) => part.label),
  ];
  assert.equal(response.original, expected.join(" "));
  assert.match(response.original, /5 out of 10/);
  assert.match(response.original, /Right knee/);
  assert.match(response.original, /Left knee/);
  const sent = await requests[0].json();
  assert.ok(sent.inputs.every((input: { kind: string }) => input.kind === "option"));
  assert.ok(sent.inputs.some((input: { questionId: string }) => input.questionId === "associated_symptoms"));
  assert.ok(sent.inputs.some((input: { questionId: string }) => input.questionId === "aggravating_factors"));
  assert.doesNotMatch(JSON.stringify(sent), /partId|"spots"|"x"|"y"/);
  assert.match(response.lowConfidence[0].reason, /No model was called/);
});

test("unsupported reply availability comes from the API, including English and frontend quick replies", async (t) => {
  connectRoutes(t);
  for (const language of ["en", "es", "ar", "zh-Hans"]) {
    const response = await respond({
      context: { language, mode: "standard", readingLevel: 3 },
      message: "I’m going to listen to your chest. Please breathe slowly.",
    });
    assert.equal(isReplyUnavailable(response), true);
  }
  assert.equal(isReplyUnavailable({ patientText: "Translation unavailable.", readAloudText: "Translation unavailable.", teachBackPrompt: "Please ask a qualified interpreter for help." }), true);
});

test("adapter rejects HTTP errors, invalid JSON, malformed schemas and network failures without echoing bodies", async (t) => {
  const secret = "synthetic-private-error";
  for (const response of [
    new Response(secret, { status: 400 }),
    new Response(secret, { status: 502 }),
    new Response(secret),
    Response.json({ ...STORIES[0].respondResponse, extra: secret }),
    Response.json({ patientText: "incomplete" }),
  ]) {
    const mock = t.mock.method(globalThis, "fetch", async () => response.clone());
    await assert.rejects(respond(STORIES[0].respondRequest), (error: Error) => {
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    });
    mock.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Network unavailable"); });
  await assert.rejects(translate(STORIES[0].translateRequest));
});

test("invalid selections are rejected by the route; undeclared request fields and metrics never fetch", async (t) => {
  const requests = connectRoutes(t);
  for (const input of [
    { questionId: "where", kind: "option" as const, value: "unknown-part" },
    { questionId: "how_long", kind: "pictogram" as const, value: "clock" },
    { kind: "option" as const, value: "head" },
  ]) {
    await assert.rejects(translate({ context: STORIES[0].translateRequest.context, inputs: [input] }));
  }
  assert.throws(() => respond({ ...STORIES[0].respondRequest, name: "extra" } as Parameters<typeof respond>[0]));
  track({ event: "session_started", mode: "standard" });
  assert.equal(requests.length, 3);
});
