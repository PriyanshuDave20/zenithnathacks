import { RespondRequestSchema, type ApiError } from "../../../lib/contracts";
import { InvalidRespondInputError, respond } from "../../../lib/server/respond";

const headers = { "Cache-Control": "no-store" };

function error(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiError, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "invalid_request", "Provide a valid JSON respond request.");
  }
  const parsed = RespondRequestSchema.safeParse(body);
  if (!parsed.success) return error(400, "invalid_request", "Provide a valid respond request.");

  try {
    return Response.json(await respond(parsed.data, undefined, undefined, request.signal), { headers });
  } catch (cause) {
    if (cause instanceof InvalidRespondInputError) return error(400, "invalid_request", cause.message);
    // Never expose provider exceptions, schema details, or message content.
    return error(502, "model_failure", "The reply is unavailable. Please try again or use typed input.");
  }
}
