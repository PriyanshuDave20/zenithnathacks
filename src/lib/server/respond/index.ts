import { RespondResponseSchema, type RespondRequest, type RespondResponse } from "../../contracts";
import { callModel } from "../llm";
import { redact } from "../redact";
import { RESPOND_PROMPT } from "./prompts";

export class InvalidRespondInputError extends Error {
  constructor() {
    super("Provide a nonempty clinician message and a valid language tag.");
  }
}

/** Per-request processing only. The route validates input with the shared schema. */
export async function respond(
  request: RespondRequest,
  model: typeof callModel = callModel,
): Promise<RespondResponse> {
  if (!request.message.trim() || !request.context.language.trim()) throw new InvalidRespondInputError();
  try {
    Intl.getCanonicalLocales(request.context.language);
  } catch {
    throw new InvalidRespondInputError();
  }

  const raw = await model({
    system: RESPOND_PROMPT,
    user: JSON.stringify({
      task: "respond",
      request: { context: request.context, message: redact(request.message).text },
    }),
  });
  const response = RespondResponseSchema.parse(JSON.parse(raw));
  if (Object.values(response).some((value) => !value.trim())) {
    throw new Error("Model returned an empty reply field.");
  }
  // Mask every returned field, including read-aloud text and the teach-back question.
  return RespondResponseSchema.parse({
    patientText: redact(response.patientText).text,
    readAloudText: redact(response.readAloudText).text,
    teachBackPrompt: redact(response.teachBackPrompt).text,
  });
}
