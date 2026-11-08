import { z } from "zod";
import { QUESTIONS } from "./index";
import clinical from "./medical_terms.json";
import cached from "./language-packs.json";

export const GUIDED_LANGUAGES = ["en", "es", "ar", "zh-Hans"] as const;
const TextSchema = z.string().trim().min(1);
export const TranslatedQuestionsSchema = z.record(z.string(), z.strictObject({
  text: TextSchema,
  options: z.record(z.string(), TextSchema),
}));
export type TranslatedQuestions = z.infer<typeof TranslatedQuestionsSchema>;
export const QUESTION_SOURCE = Object.fromEntries(QUESTIONS.map((question, i) => [question.id, {
  text: question.text.en,
  clinical: clinical.history_questions[i].clinical_phrase,
  topic: clinical.history_questions[i].topic,
  options: Object.fromEntries(question.options.map((option) => [option.id, option.label])),
}]));

export const LanguagePackSchema = z.strictObject({
  schemaVersion: z.literal(1),
  language: z.enum(GUIDED_LANGUAGES),
  generatedBy: TextSchema,
  generatedAt: z.iso.datetime(),
  reviewStatus: z.enum(["draft", "reviewed"]),
  reviewNotes: z.string().optional(),
  // Exact English source snapshot makes changed questions/options invalidate old packs.
  source: z.record(z.string(), z.strictObject({
    text: TextSchema, clinical: TextSchema, topic: TextSchema, options: z.record(z.string(), TextSchema),
  })),
  questions: TranslatedQuestionsSchema,
});
export type LanguagePack = z.infer<typeof LanguagePackSchema>;

function sameKeys(a: object, b: object): boolean {
  return JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort());
}

/** Catch cross-language contamination; this is not a translation-quality assessment. */
export function validateWritingSystem(language: LanguagePack["language"], text: string): void {
  const script = language === "ar" ? /\p{Script=Arabic}/u : language === "zh-Hans" ? /\p{Script=Han}/u : /\p{Script=Latin}/u;
  if ([...text].some((character) => /\p{L}/u.test(character) && !script.test(character))) {
    throw new Error("Generated text contains an unexpected writing system.");
  }
}

export function numericTokens(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (digit) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(digit) >= 0 ? "٠١٢٣٤٥٦٧٨٩".indexOf(digit) : "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).match(/\d+/g)?.sort().join() ?? "";
}

/** Fail closed on missing/extra IDs, blank strings, or a changed English source. */
export function validateLanguagePack(value: unknown): LanguagePack {
  const pack = LanguagePackSchema.parse(value);
  if (!sameKeys(pack.source, QUESTION_SOURCE) || !sameKeys(pack.questions, QUESTION_SOURCE)) {
    throw new Error("Language pack does not cover the question bank.");
  }
  for (const [id, source] of Object.entries(QUESTION_SOURCE)) {
    const snapshot = pack.source[id];
    if (snapshot.text !== source.text || snapshot.clinical !== source.clinical || snapshot.topic !== source.topic
      || !sameKeys(snapshot.options, source.options) || !sameKeys(pack.questions[id].options, source.options)
      || Object.entries(source.options).some(([oid, label]) => snapshot.options[oid] !== label)) {
      throw new Error("Language pack is stale or incomplete.");
    }
    validateWritingSystem(pack.language, pack.questions[id].text);
    Object.values(pack.questions[id].options).forEach((text) => validateWritingSystem(pack.language, text));
    if (numericTokens(pack.questions[id].text) !== numericTokens(source.text)
      || Object.entries(source.options).some(([oid, label]) => numericTokens(pack.questions[id].options[oid]) !== numericTokens(label))) {
      throw new Error("Generated text changed numeric values.");
    }
  }
  return pack;
}

const english: LanguagePack = {
  schemaVersion: 1, language: "en", generatedBy: "team-authored English source",
  generatedAt: "2026-11-07T00:00:00Z", reviewStatus: "draft", source: QUESTION_SOURCE,
  questions: Object.fromEntries(Object.entries(QUESTION_SOURCE).map(([id, q]) => [id, { text: q.text, options: q.options }])),
};

export function getLanguagePack(language: string): LanguagePack | undefined {
  if (language === "en") return english;
  const candidate = (cached as unknown[]).find((value) =>
    typeof value === "object" && value !== null && "language" in value && value.language === language);
  if (!candidate) return undefined;
  try { return validateLanguagePack(candidate); } catch { return undefined; }
}

/** The five-question bedside flow uses the same IDs/labels as the full 17-question bank. */
const BEDSIDE_IDS = ["where", "how_long", "how_strong", "aggravating_factors", "associated_symptoms"];
export function getGuidedQuestions(language: string) {
  const pack = getLanguagePack(language);
  if (!pack) return undefined;
  return BEDSIDE_IDS.map((id) => {
    const question = QUESTIONS.find((q) => q.id === id)!;
    return {
      ...question,
      text: { ...question.text, [language]: pack.questions[id].text },
      options: question.options.map((option) => ({
        ...option, text: { ...option.text, [language]: pack.questions[id].options[option.id] },
      })),
    };
  });
}
