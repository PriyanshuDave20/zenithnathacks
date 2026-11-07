import { z } from "zod";
import type { RegionId } from "./input";

export * from "./input";

export const ModeSchema = z.enum(["standard", "deaf_hoh", "low_literacy", "mute"]);
export const LanguageSchema = z.string();
export const ReadingLevelSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
]);

// Reject extra fields rather than carrying undeclared identifiers through the API.
export const PatientContextSchema = z.strictObject({
  language: LanguageSchema,
  mode: ModeSchema,
  readingLevel: ReadingLevelSchema.default(3),
});

export const TranslateInputSchema = z.strictObject({
  questionId: z.string().optional(),
  kind: z.enum(["text", "speech_transcript", "pictogram", "option"]),
  value: z.string(),
});

export const TranslateRequestSchema = z.strictObject({
  context: PatientContextSchema,
  inputs: z.array(TranslateInputSchema),
});

export const TranslateResponseSchema = z.strictObject({
  original: z.string(),
  translated: z.string(),
  backTranslation: z.string(),
  summary: z.strictObject({
    chiefComplaint: z.string(),
    symptoms: z.array(z.string()),
    duration: z.string().optional(),
    redFlags: z.array(z.string()),
  }),
  lowConfidence: z.array(z.strictObject({ phrase: z.string(), reason: z.string() })),
  redactions: z.number().int().nonnegative(),
});

export const RespondRequestSchema = z.strictObject({
  context: PatientContextSchema,
  message: z.string(),
});

export const RespondResponseSchema = z.strictObject({
  patientText: z.string(),
  readAloudText: z.string(),
  teachBackPrompt: z.string(),
});

export const MetricsEventSchema = z.strictObject({
  event: z.enum(["session_started", "first_message", "teachback_confirmed"]),
  mode: ModeSchema,
  msSinceStart: z.number().nonnegative().optional(),
});

export const ApiErrorSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string() }),
});

export const RegionIdSchema = z.enum([
  "head", "neck", "chest", "abdomen", "back", "left_arm", "right_arm", "left_leg", "right_leg",
] satisfies RegionId[]);

export const QuestionOptionSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  pictogram: z.string().optional(),
  text: z.record(LanguageSchema, z.string()),
});

export const QuestionSchema = z.strictObject({
  id: z.string(),
  text: z.record(LanguageSchema, z.string()),
  options: z.array(QuestionOptionSchema),
  followsRegion: RegionIdSchema.optional(),
});

export type Mode = z.infer<typeof ModeSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type ReadingLevel = z.infer<typeof ReadingLevelSchema>;
export type PatientContext = z.infer<typeof PatientContextSchema>;
export type TranslateInput = z.infer<typeof TranslateInputSchema>;
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;
export type TranslateResponse = z.infer<typeof TranslateResponseSchema>;
export type RespondRequest = z.infer<typeof RespondRequestSchema>;
export type RespondResponse = z.infer<typeof RespondResponseSchema>;
export type MetricsEvent = z.infer<typeof MetricsEventSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
