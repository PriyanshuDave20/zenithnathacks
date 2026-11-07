import {
  TranslateResponseSchema,
  type TranslateInput,
  type TranslateRequest,
  type TranslateResponse,
} from "../../contracts";
import { QUESTIONS } from "../../questions";
import { callModel } from "../llm";
import { redact } from "../redact";
import { translatePrompt } from "./prompts";

export class InvalidTranslateInputError extends Error {
  constructor() {
    super("Provide nonempty input and valid, unambiguous question-bank selections.");
  }
}

function resolveInput(input: TranslateInput): TranslateInput {
  const question = QUESTIONS.find(({ id }) => id === input.questionId);
  if (input.questionId !== undefined && !question) throw new InvalidTranslateInputError();

  if (input.kind === "text" || input.kind === "speech_transcript") {
    if (!input.value.trim()) throw new InvalidTranslateInputError();
    return input;
  }

  // IDs such as "yes" and pictograms such as "arm" are not globally unique.
  if (!question) throw new InvalidTranslateInputError();
  const options = question.options.filter((option) => input.kind === "option"
    ? option.id === input.value
    : option.pictogram === input.value);
  if (options.length !== 1) throw new InvalidTranslateInputError();
  return { ...input, value: options[0].label };
}

/** Per-request processing only. The caller validates the HTTP request with the shared schema. */
export async function translate(
  request: TranslateRequest,
  model: typeof callModel = callModel,
): Promise<TranslateResponse> {
  if (!request.inputs.length || !request.context.language.trim()) throw new InvalidTranslateInputError();
  // Do not forward arbitrary strings masquerading as a language tag to the model.
  try {
    Intl.getCanonicalLocales(request.context.language);
  } catch {
    throw new InvalidTranslateInputError();
  }

  let redactions = 0;
  const mask = (value: string) => {
    const result = redact(value);
    redactions += result.count;
    return result.text;
  };
  const inputs = request.inputs.map(resolveInput).map((input) => ({ ...input, value: mask(input.value) }));
  const original = inputs.map(({ value }) => value).join(" ").trim();
  const questions = QUESTIONS.filter(({ id }) => inputs.some(({ questionId }) => questionId === id));
  const raw = await model({
    system: translatePrompt(questions),
    user: JSON.stringify({ task: "translate", request: { context: request.context, inputs } }),
  });
  const response = TranslateResponseSchema.parse(JSON.parse(raw));

  // The pipeline owns original/count: the mock redacts again and would otherwise report zero.
  // Mask every other returned string too; never trust a provider to omit identifiers by itself.
  const result = {
    original,
    translated: mask(response.translated),
    backTranslation: mask(response.backTranslation),
    summary: {
      chiefComplaint: mask(response.summary.chiefComplaint),
      symptoms: response.summary.symptoms.map(mask),
      ...(response.summary.duration === undefined ? {} : { duration: mask(response.summary.duration) }),
      redFlags: response.summary.redFlags.map(mask),
    },
    lowConfidence: response.lowConfidence.map(({ phrase, reason }) => ({ phrase: mask(phrase), reason: mask(reason) })),
  };
  // Count masked occurrences in the input plus returned fields, not unique identifiers.
  return TranslateResponseSchema.parse({ ...result, redactions });
}
