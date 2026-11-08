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
import { guidedPack, resolveGuided, summarizeGuided, type GuidedAnswer } from "./guided";
import { InvalidTranslateInputError } from "./errors";
export { InvalidTranslateInputError } from "./errors";

/** Providers sometimes use null for an absent optional duration. Keep the HTTP contract optional, never null. */
function normalizeAbsentDuration(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !("summary" in value)) return value;
  const summary = value.summary;
  if (summary === null || typeof summary !== "object" || Array.isArray(summary)
    || !("duration" in summary) || summary.duration !== null) return value;
  const normalized: Record<string, unknown> = { ...summary };
  delete normalized.duration;
  return { ...value, summary: normalized };
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
  const hasGuided = request.inputs.some((i) => i.kind === "option" || i.kind === "pictogram");
  const pack = hasGuided ? guidedPack(request.context.language) : undefined;
  const answers: GuidedAnswer[] = [];
  const freeInputs: TranslateInput[] = [];
  const originals: string[] = [];
  for (const input of request.inputs) {
    if (input.kind === "option" || input.kind === "pictogram") {
      const answer = resolveGuided(input, pack!);
      answers.push(answer);
      originals.push(answer.patient);
    } else {
      if (!input.value.trim() || (input.questionId !== undefined && !QUESTIONS.some((q) => q.id === input.questionId))) {
        throw new InvalidTranslateInputError();
      }
      const value = mask(input.value);
      freeInputs.push({ ...input, value });
      originals.push(value);
    }
  }
  const guided = pack ? summarizeGuided(answers, pack) : undefined;
  let free: TranslateResponse | undefined;
  // No model/config/key/network access at all for pure guided communication.
  if (freeInputs.length) {
    const questions = QUESTIONS.filter(({ id }) => freeInputs.some(({ questionId }) => questionId === id));
    const raw = await model({
      system: translatePrompt(questions),
      user: JSON.stringify({ task: "translate", request: { context: request.context, inputs: freeInputs } }),
    });
    free = TranslateResponseSchema.parse(normalizeAbsentDuration(JSON.parse(raw)));
    if (![free.translated, free.backTranslation, free.summary.chiefComplaint].every((s) => s.trim())) {
      throw new Error("Translation returned an empty required field.");
    }
  }
  const parts = [guided, free].filter((value): value is TranslateResponse => value !== undefined);
  const join = (values: (string | undefined)[]) => [...new Set(values.filter((s): s is string => s !== undefined))].join("\n");
  const duration = join(parts.map((p) => p.summary.duration));
  const response: TranslateResponse = {
    original: originals.join(" ").trim(),
    translated: join(parts.map((p) => p.translated)),
    backTranslation: join(parts.map((p) => p.backTranslation)),
    summary: {
      chiefComplaint: join(parts.map((p) => p.summary.chiefComplaint)),
      symptoms: [...new Set(parts.flatMap((p) => p.summary.symptoms))],
      ...(duration ? { duration } : {}),
      redFlags: [...new Set(parts.flatMap((p) => p.summary.redFlags))],
    },
    lowConfidence: parts.flatMap((p) => p.lowConfidence),
    redactions: 0,
  };

  // The pipeline owns original/count: the mock redacts again and would otherwise report zero.
  // Mask every other returned string too; never trust a provider to omit identifiers by itself.
  const result = {
    original: response.original,
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
