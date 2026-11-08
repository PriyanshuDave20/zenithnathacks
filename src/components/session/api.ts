// Browser adapter for the stateless API routes. The server still uses its offline mock provider.
import { z } from "zod";
import {
  MetricsEventSchema,
  RespondRequestSchema,
  RespondResponseSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
  type MetricsEvent,
  type RespondRequest,
  type RespondResponse,
  type TranslateRequest,
  type TranslateResponse,
} from "../../lib/contracts";

/** Refers to browser mock calls, not the server's model provider. */
export const USING_MOCKS = false;

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
  // Keep choices as IDs: converting them to text would incorrectly invoke the model.
  return post("/api/translate", request, TranslateResponseSchema);
}

export function respond(req: RespondRequest): Promise<RespondResponse> {
  return post("/api/respond", RespondRequestSchema.parse(req), RespondResponseSchema);
}

/** Shared sentinel convention in the reply prompt; never infer support from a UI phrase list. */
export function isReplyUnavailable(response: RespondResponse): boolean {
  return response.patientText === "Translation unavailable."
    || response.patientText === "Mock provider: no translated reply available.";
}

/** Timestamp for the start of a visit, used only for the rough first-message timing bucket. */
export function startClock(): number {
  return Date.now();
}

/** Milliseconds since a start timestamp, or undefined when the visit has not started. */
export function elapsedSince(start: number | null): number | undefined {
  return start === null ? undefined : Date.now() - start;
}

/**
 * Anonymous product metrics: only the event name, mode and a rough timing, never any session content or identifier.
 * Fire-and-forget: a failure is silent and must never affect the visit.
 */
export function track(event: MetricsEvent): void {
  try {
    const parsed = MetricsEventSchema.safeParse(event);
    if (!parsed.success) return;
    void fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      credentials: "omit",
      keepalive: true,
      signal: AbortSignal.timeout(5_000),
    }).catch(() => {});
  } catch {
    /* metrics are optional */
  }
}
