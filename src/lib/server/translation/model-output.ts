import { z } from "zod";
import { TranslateResponseSchema } from "../../contracts";

export const EnglishSummarySchema = z.strictObject({
  summary: TranslateResponseSchema.shape.summary,
  lowConfidence: TranslateResponseSchema.shape.lowConfidence,
});

/** Normalize only the known absent-duration representation; reject all other contract drift. */
export function normalizeAbsentDuration(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !("summary" in value)) return value;
  const summary = value.summary;
  if (summary === null || typeof summary !== "object" || Array.isArray(summary)
    || !("duration" in summary) || summary.duration !== null) return value;
  const normalized: Record<string, unknown> = { ...summary };
  delete normalized.duration;
  return { ...value, summary: normalized };
}

export function processingSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(26000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
