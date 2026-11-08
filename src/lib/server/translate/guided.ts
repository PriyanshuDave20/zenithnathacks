import type { TranslateInput, TranslateResponse } from "../../contracts";
import { QUESTIONS } from "../../questions";
import { getLanguagePack, QUESTION_SOURCE, type LanguagePack } from "../../questions/localization";
import { getBodyPart } from "../../input/body-parts";
import { PHRASES } from "../../mocks/data";
import { InvalidTranslateInputError } from "./errors";

export type GuidedAnswer = { questionId: string; optionId: string; english: string; patient: string };

/** Resolve only registered IDs. No request text is promoted to a trusted cached answer. */
export function resolveGuided(input: TranslateInput, pack: LanguagePack): GuidedAnswer {
  const question = QUESTIONS.find((q) => q.id === input.questionId);
  if (!question) throw new InvalidTranslateInputError();
  // Fixed tap-phrases already have static demo translations; they are not free text.
  const phrase = question.id === "chief_complaint" && input.kind === "option" && input.value.startsWith("phrase:")
    ? PHRASES.find((p) => `phrase:${p.id}` === input.value) : undefined;
  if (phrase) return { questionId: question.id, optionId: input.value, english: phrase.en, patient: phrase.text[pack.language] };
  const options = question.options.filter((o) => input.kind === "option" ? o.id === input.value : o.pictogram === input.value);
  if (options.length === 1) {
    const option = options[0];
    return { questionId: question.id, optionId: option.id, english: option.label, patient: pack.questions[question.id].options[option.id] };
  }
  // Exact part IDs retain side/detail; ambiguous pictograms still fail.
  const part = input.kind === "option" && question.id === "where" ? getBodyPart(input.value) : undefined;
  if (part) {
    const patient = part.text[pack.language];
    return { questionId: question.id, optionId: part.id, english: part.label, patient };
  }
  throw new InvalidTranslateInputError();
}

export function guidedPack(language: string): LanguagePack {
  const pack = getLanguagePack(language);
  if (!pack) throw new InvalidTranslateInputError("Guided communication is unavailable in this language. Use free text or an interpreter.");
  return pack;
}

/** Deterministic clinical communication report, never a diagnosis or inferred symptom. */
export function summarizeGuided(answers: GuidedAnswer[], pack: LanguagePack): TranslateResponse {
  const byQuestion = new Map<string, GuidedAnswer[]>();
  for (const answer of answers) {
    const group = byQuestion.get(answer.questionId) ?? [];
    if (!group.some((a) => a.optionId === answer.optionId)) group.push(answer);
    byQuestion.set(answer.questionId, group);
  }
  const labels = (id: string) => byQuestion.get(id)?.map((a) => a.english).join("; ");
  const translated = [...byQuestion].map(([id, group]) =>
    `${QUESTION_SOURCE[id].topic}: ${group.map((a) => a.english).join("; ")}`).join("\n");
  const readBack = [...byQuestion].map(([id, group]) =>
    `${pack.questions[id].text} ${group.map((a) => a.patient).join("; ")}`).join("\n");
  const symptomQuestions = new Set(["associated_symptoms", "character", "aggravating_factors", "relieving_factors", "how_strong"]);
  const symptoms = [...byQuestion].filter(([id]) => symptomQuestions.has(id)).flatMap(([id, group]) =>
    group.map((a) => `${QUESTION_SOURCE[id].topic}: ${a.english}`));
  return {
    original: answers.map((a) => a.patient).join(" "),
    translated,
    backTranslation: readBack,
    summary: {
      chiefComplaint: labels("chief_complaint") ?? (labels("where") ? `Reported location: ${labels("where")}` : "Main problem not provided."),
      symptoms,
      ...(labels("how_long") ? { duration: labels("how_long") } : {}),
      redFlags: (byQuestion.get("red_flags") ?? []).filter((a) => !["none", "unsure"].includes(a.optionId)).map((a) => a.english),
    },
    lowConfidence: pack.reviewStatus === "draft" ? [{
      phrase: "Guided question bank",
      reason: "Static question and answer wording is a draft requiring clinical and fluent-speaker review. No model was called for guided answers.",
    }] : [],
    redactions: 0,
  };
}
