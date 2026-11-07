import medicalTerms from "./medical_terms.json";
import type { Question, QuestionOption, RegionId } from "../contracts";

// English-only skeleton from the team's draft source. Clinical and fluent-language
// review, pre-translations, and pictogram assets are follow-up work.
const option = (id: string, label: string, pictogram?: string): QuestionOption => ({
  id, label, text: { en: label }, ...(pictogram ? { pictogram } : {}),
});
const unsure = () => option("unsure", "Not sure");
const other = () => option("other", "Something else");
const yesNo = () => [option("yes", "Yes"), option("no", "No"), unsure()];

// Body selection maps directly to Location answer IDs (no left/right collapsing).
export const REGION_LABELS: Record<RegionId, string> = {
  head: "Head", neck: "Neck", chest: "Chest", abdomen: "Stomach", back: "Back",
  left_arm: "Left arm", right_arm: "Right arm", left_leg: "Left leg", right_leg: "Right leg",
};
const REGION_PICTOGRAMS: Record<RegionId, string> = {
  head: "head", neck: "neck", chest: "chest", abdomen: "abdomen", back: "back",
  left_arm: "arm", right_arm: "arm", left_leg: "leg", right_leg: "leg",
};

// Keyed by the source history-question id; the JSON remains read-only.
const DEFINITIONS: Record<number, { id: string; options: QuestionOption[] }> = {
  1: { id: "chief_complaint", options: [option("pain", "Pain"), option("breathing", "Trouble breathing", "breath"), option("fever", "Fever", "fever"), other(), unsure()] },
  2: { id: "onset", options: [option("sudden", "Suddenly"), option("gradual", "Slowly"), option("today", "Today", "clock"), option("days", "A few days ago", "calendar"), option("longer", "Longer ago", "calendar"), unsure()] },
  3: {
    id: "where",
    options: [
      ...(Object.entries(REGION_LABELS) as [RegionId, string][])
        .map(([region, label]) => option(region, label, REGION_PICTOGRAMS[region])),
      option("elsewhere", "Somewhere else"), unsure(),
    ],
  },
  4: { id: "how_long", options: [option("minutes", "Minutes", "clock"), option("hours", "Hours", "clock"), option("days", "Days", "calendar"), option("constant", "All the time"), option("intermittent", "Comes and goes"), unsure()] },
  5: {
    id: "how_strong",
    options: [...Array.from({ length: 11 }, (_, value) => option(`s${value}`, `${value} out of 10`)), unsure()],
  },
  6: { id: "character", options: [option("sharp", "Sharp"), option("dull", "Dull"), option("burning", "Burning"), option("squeezing", "Squeezing"), other(), unsure()] },
  7: { id: "aggravating_factors", options: [option("moving", "Moving", "move"), option("breathing", "Breathing", "breath"), option("eating", "Eating", "eat"), option("nothing", "Nothing in particular", "none"), other(), unsure()] },
  8: { id: "relieving_factors", options: [option("rest", "Resting"), option("medicine", "Medicine"), option("position", "Changing position", "move"), option("nothing", "Nothing", "none"), other(), unsure()] },
  9: { id: "radiation", options: [option("stays", "Stays in one place"), option("moves", "Moves somewhere else"), unsure()] },
  10: { id: "associated_symptoms", options: [option("fever", "Fever", "fever"), option("vomiting", "Throwing up", "nausea"), option("short_breath", "Trouble breathing", "breath"), option("none", "Nothing else", "none"), other(), unsure()] },
  11: { id: "red_flags", options: [option("chest_pain", "Chest pain", "chest"), option("short_breath", "Trouble breathing", "breath"), option("fainting", "Fainting", "dizzy"), option("one_sided_weakness", "Weakness on one side"), option("none", "None of these", "none"), unsure()] },
  12: { id: "allergies", options: [option("medicine", "Medicine allergy"), option("food", "Food allergy", "eat"), option("other", "Another allergy"), option("none", "No known allergies", "none"), unsure()] },
  13: { id: "current_medications", options: [option("prescription", "Prescription medicine"), option("nonprescription", "Medicine bought without a prescription"), option("supplements", "Vitamins or herbal products"), option("none", "No medicines", "none"), unsure()] },
  14: { id: "past_medical_history", options: [option("illness", "Serious illness"), option("surgery", "Surgery"), option("hospital", "Hospital stay"), option("none", "None of these", "none"), unsure()] },
  15: { id: "family_history", options: [option("heart_disease", "Heart disease"), option("diabetes", "Diabetes"), option("cancer", "Cancer"), option("stroke", "Stroke"), option("none", "None of these", "none"), unsure()] },
  16: { id: "pregnancy", options: [...yesNo(), option("prefer_not_to_say", "Prefer not to say")] },
  17: { id: "substance_use", options: [option("smoking", "Smoking"), option("alcohol", "Alcohol"), option("drugs", "Other drugs"), option("none", "None of these", "none"), option("prefer_not_to_say", "Prefer not to say")] },
};

export const QUESTIONS: Question[] = medicalTerms.history_questions.map((source) => {
  const definition = DEFINITIONS[source.id];
  if (!definition) throw new Error("History question needs a question-bank definition.");
  return { id: definition.id, text: { en: source.plain_question }, options: definition.options };
});

// Follow-up skeleton: shared questions apply after any selected body region.
export const REGION_QUESTION_IDS: Record<RegionId, string[]> = Object.fromEntries(
  Object.keys(REGION_LABELS).map((region) => [region, ["where", "onset", "how_long", "how_strong", "character", "radiation"]]),
) as Record<RegionId, string[]>;

export function getQuestionsForRegion(region: RegionId): Question[] {
  return REGION_QUESTION_IDS[region].map((id) => QUESTIONS.find((question) => question.id === id)!);
}
