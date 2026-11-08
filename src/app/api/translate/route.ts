import { TranslateRequestSchema, type ApiError } from "../../../lib/contracts";
import { InvalidTranslateInputError, translate } from "../../../lib/server/translate";

const headers = { "Cache-Control": "no-store" };

function error(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiError, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "invalid_request", "Provide a valid JSON translate request.");
  }
  const parsed = TranslateRequestSchema.safeParse(body);
  if (!parsed.success) return error(400, "invalid_request", "Provide a valid translate request.");

  try {
    return Response.json(await translate(parsed.data, undefined, undefined, request.signal), { headers });
  } catch (cause) {
    if (cause instanceof InvalidTranslateInputError) {
      return error(400, "invalid_request", cause.message);
    }
    // Do not expose provider exceptions, validation details, or request content.
    return error(502, "model_failure", "Translation is unavailable. Please try again or use typed input.");
  }
}
