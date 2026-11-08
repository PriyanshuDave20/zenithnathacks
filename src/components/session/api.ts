// Browser adapter for the stateless API routes. The server still uses its offline mock provider.
import { z } from "zod";
import {
  RespondRequestSchema,
  RespondResponseSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
  type MetricsEvent,
  type RespondRequest,
  type RespondResponse,
  type TranslateInput,
  type TranslateRequest,
  type TranslateResponse,
} from "../../lib/contracts";
import { QUESTIONS } from "../../lib/mocks/data";
import { getBodyPart } from "../../lib/input/body-parts";

/** Refers to browser mock calls, not the server's model provider. */
export const USING_MOCKS = false;

// The frontend's shorter question bank predates the server bank. Send the exact
// selected English label as text so duration, laterality and /5 severity survive.
const QUESTION_IDS = new Map([
  ["worse_when", "aggravating_factors"],
  ["other", "associated_symptoms"],
]);

function guidedInput(input: TranslateInput): TranslateInput {
  const questionId = input.questionId === undefined
    ? undefined
    : QUESTION_IDS.get(input.questionId) ?? input.questionId;
  if (input.kind === "text" || input.kind === "speech_transcript") {
    return { ...input, ...(questionId === undefined ? {} : { questionId }) };
  }
  const question = QUESTIONS.find(({ id }) => id === input.questionId);
  const options = question?.options.filter((option) => input.kind === "option"
    ? option.id === input.value
    : option.pictogram === input.value) ?? [];
  const label = options.length === 1 ? options[0].label
    : input.kind === "option" && input.questionId === "where"
      ? getBodyPart(input.value)?.label
      : undefined;
  if (!label || !questionId) throw new Error("Choose a valid guided answer.");
  return { questionId, kind: "text", value: label };
}

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(30_000),
  });
  // Keep server error bodies and validation details out of UI errors and logs.
  if (!response.ok) throw new Error("Communication is unavailable. Please try again.");
  let bodyJson: unknown;
  try {
    bodyJson = await response.json();
  } catch {
    throw new Error("Communication returned an invalid response.");
  }
  const parsed = schema.safeParse(bodyJson);
  if (!parsed.success) throw new Error("Communication returned an invalid response.");
  return parsed.data;
}

export function translate(req: TranslateRequest): Promise<TranslateResponse> {
  const request = TranslateRequestSchema.parse(req);
  return post("/api/translate", { ...request, inputs: request.inputs.map(guidedInput) }, TranslateResponseSchema);
}

export function respond(req: RespondRequest): Promise<RespondResponse> {
  return post("/api/respond", RespondRequestSchema.parse(req), RespondResponseSchema);
}

/** The mock API explicitly reports unsupported replies; never infer support from a UI phrase list. */
export function isReplyUnavailable(response: RespondResponse): boolean {
  return response.patientText === "Mock provider: no translated reply available.";
}

/** Metrics remain disabled until their route and anonymous sink are implemented. */
export function track(event: MetricsEvent): void {
  void event;
}
