import { RespondResponseSchema, type RespondRequest, type RespondResponse } from "../../contracts";
import { callModel } from "../llm";
import { redact } from "../redact";
import { RESPOND_PROMPT } from "./prompts";
import { translateTexts, type TextTranslator } from "../translation";
import { processingSignal } from "../translation/model-output";

export class InvalidRespondInputError extends Error {
  constructor() {
    super("Provide a nonempty clinician message and a valid language tag.");
  }
}

/** Per-request processing only. The route validates input with the shared schema. */
export async function respond(
  request: RespondRequest,
  model: typeof callModel = callModel,
  translator: TextTranslator = translateTexts,
  signal?: AbortSignal,
): Promise<RespondResponse> {
  if (!request.message.trim() || !request.context.language.trim()) throw new InvalidRespondInputError();
  try {
    Intl.getCanonicalLocales(request.context.language);
  } catch {
    throw new InvalidRespondInputError();
  }

  const deadline = processingSignal(signal);
  deadline.throwIfAborted();
  const raw = await model({
    system: RESPOND_PROMPT,
    user: JSON.stringify({
      task: "prepare_reply",
      request: { context: { ...request.context, language: "en" }, message: redact(request.message).text },
    }),
    signal: deadline,
  });
  const response = RespondResponseSchema.parse(JSON.parse(raw));
  deadline.throwIfAborted();
  if (Object.values(response).some((value) => !value.trim())) {
    throw new Error("Model returned an empty reply field.");
  }
  // English preparation is redacted before it can reach the translation service.
  const english = {
    patientText: redact(response.patientText).text,
    readAloudText: redact(response.readAloudText).text,
    teachBackPrompt: redact(response.teachBackPrompt).text,
  };
  if (english.patientText === "Translation unavailable." || english.patientText === "Mock provider: no translated reply available.") return english;
  const translated = await translator({ texts: Object.values(english), from: "en", to: request.context.language, signal: deadline });
  return RespondResponseSchema.parse({
    patientText: redact(translated.texts[0]).text,
    readAloudText: redact(translated.texts[1]).text,
    teachBackPrompt: redact(translated.texts[2]).text,
  });
}
