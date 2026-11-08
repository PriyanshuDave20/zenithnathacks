import assert from "node:assert/strict";
import test from "node:test";
import { clearFrom, describeAnswers, EMPTY_ANSWERS, needsSide, nextStep, previousStep, type FlowAnswers } from "./icu-flow";

const pain = (extra: Partial<FlowAnswers> = {}): FlowAnswers => ({ ...EMPTY_ANSWERS, option: "pain", ...extra });

test("a non-pain choice ends after it is confirmed", () => {
  assert.equal(nextStep("root", { ...EMPTY_ANSWERS, option: "help" }), "confirm");
  assert.equal(nextStep("confirm", { ...EMPTY_ANSWERS, option: "help" }), null);
});

test("pain asks where, then side for arm and leg only, then strength, then review", () => {
  assert.equal(nextStep("confirm", pain()), "where");
  assert.equal(nextStep("where", pain({ where: "abdomen" })), "strength");
  assert.equal(nextStep("where", pain({ where: "leg" })), "side");
  assert.equal(nextStep("side", pain({ where: "leg", side: "left" })), "strength");
  assert.equal(nextStep("strength", pain({ where: "leg", side: "left", strength: "severe" })), "review");
  assert.equal(nextStep("review", pain()), null);
});

test("every step has a way back that mirrors the way forward", () => {
  assert.equal(previousStep("strength", pain({ where: "abdomen" })), "where");
  assert.equal(previousStep("strength", pain({ where: "arm" })), "side");
  assert.equal(previousStep("side", pain({ where: "arm" })), "where");
  assert.equal(previousStep("where", pain()), "confirm");
  assert.equal(previousStep("confirm", pain()), "root");
  assert.equal(previousStep("root", EMPTY_ANSWERS), "root");
});

test("going back clears the answers after that step", () => {
  const all = pain({ where: "leg", side: "left", strength: "mild" });
  assert.deepEqual(clearFrom("where", all), pain());
  assert.deepEqual(clearFrom("side", all), pain({ where: "leg" }));
  assert.deepEqual(clearFrom("strength", all), pain({ where: "leg", side: "left" }));
  assert.deepEqual(clearFrom("root", all), EMPTY_ANSWERS);
});

test("the summary lists what was said in order and skips what was not asked", () => {
  assert.deepEqual(describeAnswers(pain({ where: "leg", side: "left", strength: "severe" })), ["Pain", "Stomach".replace("Stomach", "Leg"), "Left side", "Strong"]);
  assert.deepEqual(describeAnswers(pain({ where: "abdomen", strength: "mild" })), ["Pain", "Stomach", "A little"]);
  assert.deepEqual(describeAnswers({ ...EMPTY_ANSWERS, option: "reposition" }), ["Move me"]);
  assert.equal(needsSide("back"), false);
});
