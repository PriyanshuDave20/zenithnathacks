import assert from "node:assert/strict";
import test from "node:test";
import { clearFrom, describeAnswers, EMPTY_ANSWERS, nextStep, previousStep, speakableSummary, type FlowAnswers } from "./flow";

const a = (extra: Partial<FlowAnswers> = {}): FlowAnswers => ({ ...EMPTY_ANSWERS, ...extra });

test("conversation pain: where, side for arm and leg only, strength, then review", () => {
  assert.equal(nextStep("where", a({ hurts: "yes", where: "abdomen" }), "conversation"), "strength");
  assert.equal(nextStep("where", a({ hurts: "yes", where: "leg" }), "conversation"), "side");
  assert.equal(nextStep("side", a({ where: "leg", side: "left" }), "conversation"), "strength");
  assert.equal(nextStep("strength", a(), "conversation"), "review");
  assert.equal(nextStep("review", a(), "conversation"), null);
});

test("intake keeps going: how long, worse when, anything else, review", () => {
  assert.equal(nextStep("pain_q", a({ hurts: "yes" }), "intake"), "where");
  assert.equal(nextStep("pain_q", a({ hurts: "no" }), "intake"), "other");
  assert.equal(nextStep("strength", a(), "intake"), "duration");
  assert.equal(nextStep("duration", a(), "intake"), "worse");
  assert.equal(nextStep("worse", a(), "intake"), "other");
  assert.equal(nextStep("other", a(), "intake"), "review");
});

test("back mirrors forward in both modes", () => {
  assert.equal(previousStep("pain_q", a(), "intake"), null);
  assert.equal(previousStep("where", a(), "conversation"), null);
  assert.equal(previousStep("where", a(), "intake"), "pain_q");
  assert.equal(previousStep("strength", a({ where: "arm" }), "intake"), "side");
  assert.equal(previousStep("strength", a({ where: "back" }), "intake"), "where");
  assert.equal(previousStep("other", a({ hurts: "no" }), "intake"), "pain_q");
  assert.equal(previousStep("other", a({ hurts: "yes" }), "intake"), "worse");
  assert.equal(previousStep("review", a(), "conversation"), "strength");
  assert.equal(previousStep("review", a(), "intake"), "other");
});

test("going back clears this answer and everything after it", () => {
  const all = a({ hurts: "yes", where: "leg", side: "left", strength: "severe", duration: "days", worse: "moving", other: "fever" });
  assert.deepEqual(clearFrom("strength", all), a({ hurts: "yes", where: "leg", side: "left" }));
  assert.deepEqual(clearFrom("where", all), a({ hurts: "yes" }));
  assert.deepEqual(clearFrom("pain_q", all), EMPTY_ANSWERS);
  assert.deepEqual(clearFrom("review", all), all);
});

test("the clinician summary lists parts in order and skips 'nothing' answers", () => {
  assert.deepEqual(
    describeAnswers(a({ hurts: "yes", where: "leg", side: "left", strength: "severe", duration: "days", worse: "moving", other: "fever" })),
    ["Pain", "Leg", "Left side", "Strong", "1–2 days", "Worse: Moving", "Fever"],
  );
  assert.deepEqual(describeAnswers(a({ hurts: "no", other: "none" })), ["No pain"]);
});

test("the spoken summary reads as plain sentences", () => {
  assert.equal(
    speakableSummary(a({ hurts: "yes", where: "leg", side: "left", strength: "severe", worse: "moving" })),
    "I have pain in my left leg. It is severe. It is worse when I move.",
  );
  assert.equal(speakableSummary(a({ hurts: "yes", where: "abdomen", strength: "mild" })), "I have pain in my stomach. It is mild.");
  assert.equal(speakableSummary(a({ hurts: "no", other: "none" })), "I do not have pain.");
  assert.equal(speakableSummary(a({ hurts: "yes", where: "arm", side: "both" })), "I have pain in my arm, on both sides.");
});
