import assert from "node:assert/strict";
import { test } from "node:test";
import source from "./medical_terms.json";
import { QuestionSchema, RegionIdSchema } from "../contracts";
import type { RegionId } from "../contracts/input";
import { QUESTIONS, REGION_LABELS, REGION_QUESTION_IDS, getQuestionsForRegion } from "./index";

test("covers exactly the 17 source questions with unchanged English wording", () => {
  assert.equal(source.history_questions.length, 17);
  assert.equal(QUESTIONS.length, 17);
  assert.equal(new Set(QUESTIONS.map((question) => question.id)).size, 17);
  QUESTIONS.forEach((question, index) => {
    QuestionSchema.parse(question);
    assert.equal(question.text.en, source.history_questions[index].plain_question);
    assert.ok(question.options.length > 0);
    assert.equal(new Set(question.options.map((answer) => answer.id)).size, question.options.length);
    for (const answer of question.options) {
      assert.ok(answer.label);
      assert.equal(answer.text.en, answer.label);
      if (answer.pictogram) assert.match(answer.pictogram, /^[a-z_]+$/);
    }
  });
});

test("Location maps every existing RegionId to a distinct answer and follow-ups", () => {
  const location = QUESTIONS.find((question) => question.id === "where")!;
  const regions = Object.keys(REGION_LABELS) as RegionId[];
  assert.deepEqual([...regions].sort(), [...RegionIdSchema.options].sort());
  for (const region of regions) {
    assert.ok(location.options.find((answer) => answer.id === region && answer.pictogram));
    const followUps = getQuestionsForRegion(region);
    assert.deepEqual(followUps.map((question) => question.id), REGION_QUESTION_IDS[region]);
    assert.ok(followUps.includes(location));
  }
});

test("severity preserves the source's 0–10 scale", () => {
  const severity = QUESTIONS.find((question) => question.id === "how_strong")!;
  assert.deepEqual(severity.options.slice(0, 11).map((answer) => answer.label),
    Array.from({ length: 11 }, (_, value) => `${value} out of 10`));
});
