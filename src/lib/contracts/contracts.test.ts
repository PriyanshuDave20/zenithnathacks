import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ApiErrorSchema, MetricsEventSchema, PatientContextSchema, QuestionSchema,
  RespondRequestSchema, RespondResponseSchema, TranslateRequestSchema, TranslateResponseSchema,
} from "./index";
import type * as Contracts from "./index";
import type * as Frontend from "../mocks/types";
import { STORIES } from "../server/fixtures/stories";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

test("all public types exactly match the frontend draft types", () => {
  // A mismatch fails compilation, including extra fields or changed optionality.
  const compatible: {
    mode: Equal<Contracts.Mode, Frontend.Mode>;
    language: Equal<Contracts.Language, Frontend.Language>;
    readingLevel: Equal<Contracts.ReadingLevel, Frontend.ReadingLevel>;
    context: Equal<Contracts.PatientContext, Frontend.PatientContext>;
    input: Equal<Contracts.TranslateInput, Frontend.TranslateInput>;
    translateRequest: Equal<Contracts.TranslateRequest, Frontend.TranslateRequest>;
    translateResponse: Equal<Contracts.TranslateResponse, Frontend.TranslateResponse>;
    respondRequest: Equal<Contracts.RespondRequest, Frontend.RespondRequest>;
    respondResponse: Equal<Contracts.RespondResponse, Frontend.RespondResponse>;
    metrics: Equal<Contracts.MetricsEvent, Frontend.MetricsEvent>;
    error: Equal<Contracts.ApiError, Frontend.ApiError>;
    question: Equal<Contracts.Question, Frontend.Question>;
    option: Equal<Contracts.QuestionOption, Frontend.QuestionOption>;
  } = {
    mode: true, language: true, readingLevel: true, context: true, input: true,
    translateRequest: true, translateResponse: true, respondRequest: true,
    respondResponse: true, metrics: true, error: true, question: true, option: true,
  };
  assert.ok(Object.values(compatible).every(Boolean));
});

test("all synthetic fixture requests and responses validate without shape changes", () => {
  for (const story of STORIES) {
    assert.deepEqual(TranslateRequestSchema.parse(story.translateRequest), story.translateRequest);
    assert.deepEqual(TranslateResponseSchema.parse(story.translateResponse), story.translateResponse);
    assert.deepEqual(RespondRequestSchema.parse(story.respondRequest), story.respondRequest);
    assert.deepEqual(RespondResponseSchema.parse(story.respondResponse), story.respondResponse);
  }
});

test("accepts mixed input kinds and optional questionId; defaults readingLevel to 3", () => {
  const result = TranslateRequestSchema.parse({
    context: { language: "es", mode: "mute" },
    inputs: [
      { kind: "text", value: "Me duele." },
      { kind: "speech_transcript", value: "Me duele." },
      { kind: "option", questionId: "where", value: "chest" },
      { kind: "pictogram", questionId: "where", value: "chest" },
    ],
  });
  assert.equal(result.context.readingLevel, 3);
  assert.equal(result.inputs[0].questionId, undefined);
  assert.equal(result.inputs[2].questionId, "where");
});

test("rejects invalid modes, levels, kinds, and response structures", () => {
  const context = STORIES[0].translateRequest.context;
  for (const readingLevel of [0, 6, 2.5, "3", null]) {
    assert.equal(PatientContextSchema.safeParse({ ...context, readingLevel }).success, false);
  }
  assert.equal(PatientContextSchema.safeParse({ ...context, mode: "icu" }).success, false);
  assert.equal(TranslateRequestSchema.safeParse({ context, inputs: [{ kind: "video", value: "" }] }).success, false);
  assert.equal(TranslateResponseSchema.safeParse({ ...STORIES[0].translateResponse, redactions: -1 }).success, false);
  assert.equal(TranslateResponseSchema.safeParse({ ...STORIES[0].translateResponse, redactions: 0.5 }).success, false);
  assert.equal(RespondResponseSchema.safeParse({ patientText: "Only one field" }).success, false);
});

test("metrics are content-free and errors keep the agreed shape", () => {
  for (const event of ["session_started", "first_message", "teachback_confirmed"]) {
    assert.equal(MetricsEventSchema.safeParse({ event, mode: "standard", msSinceStart: 0 }).success, true);
  }
  assert.equal(MetricsEventSchema.safeParse({ event: "first_message", mode: "mute", msSinceStart: -1 }).success, false);
  assert.equal(MetricsEventSchema.safeParse({ event: "first_message", mode: "mute", message: "content" }).success, false);
  assert.equal(MetricsEventSchema.safeParse({ event: "unknown", mode: "mute" }).success, false);
  assert.deepEqual(ApiErrorSchema.parse({ error: { code: "model_unavailable", message: "Try typing." } }), {
    error: { code: "model_unavailable", message: "Try typing." },
  });
});

test("rejects undeclared identifier fields at every object boundary", () => {
  const request = STORIES[0].translateRequest;
  for (const value of [
    { ...request, patientId: "synthetic" },
    { ...request, context: { ...request.context, name: "synthetic" } },
    { ...request, inputs: [{ ...request.inputs[0], dob: "synthetic" }] },
  ]) {
    assert.equal(TranslateRequestSchema.safeParse(value).success, false);
  }
  assert.equal(QuestionSchema.safeParse({ id: "q", text: { en: "Where?" }, options: [], followsRegion: "arm" }).success, false);
});
