import { z } from "zod";
import { RespondRequestSchema, RespondResponseSchema, TranslateRequestSchema, TranslateResponseSchema } from "../../contracts";
import { STORIES } from "../fixtures/stories";
import { redact } from "../redact";
import type { ModelRequest } from "../llm";
import { EnglishSummarySchema } from "../translation/model-output";

const TaskSchema = z.discriminatedUnion("task", [
  z.strictObject({ task: z.literal("translate"), request: TranslateRequestSchema }),
  z.strictObject({ task: z.literal("respond"), request: RespondRequestSchema }),
  z.strictObject({ task: z.literal("summarize"), request: TranslateRequestSchema.refine((request) => request.context.language === "en") }),
  z.strictObject({ task: z.literal("prepare_reply"), request: RespondRequestSchema.refine((request) => request.context.language === "en") }),
]);

/** Deterministic, local-only synthetic responses. No content is retained between calls. */
export async function callMock({ user }: ModelRequest): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(user);
  } catch {
    // Ordinary text prompts also work through the provider-neutral interface.
    return "Mock provider: no live model is configured. Use a synthetic task for canned JSON.";
  }
  if (!parsed || typeof parsed !== "object" || !("task" in parsed)) {
    return "Mock provider: no live model is configured. Use a synthetic task for canned JSON.";
  }
  let task: z.infer<typeof TaskSchema>;
  try {
    task = TaskSchema.parse(parsed);
  } catch {
    throw new Error("Mock provider expects a valid synthetic task.");
  }

  if (task.task === "summarize") {
    const text = task.request.inputs.map((input) => redact(input.value).text).join(" ");
    const fixture = STORIES.find((story) => story.translateResponse.translated === text);
    return JSON.stringify(EnglishSummarySchema.parse({
      summary: fixture?.translateResponse.summary ?? { chiefComplaint: "Mock provider: summary unavailable.", symptoms: [], redFlags: [] },
      lowConfidence: [],
    }));
  }

  if (task.task === "prepare_reply") {
    const fixture = STORIES.find((story) => story.respondRequest.context.language === "en" && story.respondRequest.message === task.request.message);
    return JSON.stringify(RespondResponseSchema.parse(fixture?.respondResponse ?? {
      patientText: "Mock provider: no translated reply available.",
      readAloudText: "Mock provider: no translated reply available.",
      teachBackPrompt: "Mock provider: teach-back unavailable.",
    }));
  }

  if (task.task === "translate") {
    const { context, inputs } = task.request;
    const { text, count } = redact(inputs.map((input) => input.value).join(" ").trim());
    const fixture = inputs.every((input) => input.kind === "text" || input.kind === "speech_transcript")
      && inputs.every((input) => input.questionId === undefined)
      ? STORIES.find((story) => story.translateRequest.context.language === context.language
        && story.translateRequest.inputs[0].value === text)
      : undefined;

    const response = fixture ? { ...fixture.translateResponse, redactions: count } : {
      original: text,
      translated: "Mock provider: no translation available for this input.",
      backTranslation: text,
      summary: { chiefComplaint: "Mock provider: summary unavailable.", symptoms: [], redFlags: [] },
      lowConfidence: [{ phrase: text, reason: "Mock provider supports only the synthetic fixture stories; no translation was performed." }],
      redactions: count,
    };
    return JSON.stringify(TranslateResponseSchema.parse(response));
  }

  const { context, message } = task.request;
  const fixture = STORIES.find((story) => story.respondRequest.context.language === context.language
    && story.respondRequest.message === message);
  return JSON.stringify(RespondResponseSchema.parse(fixture?.respondResponse ?? {
    patientText: "Mock provider: no translated reply available.",
    readAloudText: "Mock provider: no translated reply available.",
    teachBackPrompt: "Mock provider: teach-back unavailable.",
  }));
}
