import type { PatientLanguage, TranslateInput } from "../../lib/mocks";
import { PHRASES } from "../../lib/mocks/data";
import { getGuidedQuestions } from "../../lib/questions/localization";
import { getBodyPart } from "../../lib/input/body-parts";

/** Browser-memory report labels for pending/failed translation, never a new model input. */
export function displayInputs(inputs: TranslateInput[], language: PatientLanguage): string {
  const questions = getGuidedQuestions(language) ?? [];
  return inputs.map(input => {
    if (input.kind === "text" || input.kind === "speech_transcript") return input.value;
    const phrase = PHRASES.find(p => `phrase:${p.id}` === input.value);
    if (input.questionId === "chief_complaint" && phrase) return phrase.text[language];
    const q = questions.find(q => q.id === input.questionId);
    const answer = q?.options.find(o => input.kind === "option" ? o.id === input.value : o.pictogram === input.value);
    const part = input.questionId === "where" ? getBodyPart(input.value) : undefined;
    const label = answer?.text[language] ?? part?.text[language];
    return label ? `${q?.text[language] ?? ""} ${label}`.trim() : ({ en: "Answer unavailable", es: "Respuesta no disponible", ar: "الإجابة غير متاحة", "zh-Hans": "答案不可用" })[language];
  }).join(" · ");
}
