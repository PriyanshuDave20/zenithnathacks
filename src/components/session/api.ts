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

/** Metrics remain disabled until their route and anonymous sink are implemented. */
export function track(event: MetricsEvent): void {
  void event;
}
