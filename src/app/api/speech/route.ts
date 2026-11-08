import { z } from "zod";
import { azureSpeechAvailable, MAX_SPEECH_TEXT, speechLanguage, synthesizeSpeech } from "../../../lib/server/speech";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const Input = z.strictObject({ text: z.string().trim().min(1).max(MAX_SPEECH_TEXT), language: z.string().min(1).max(50) });
const failure = (status: number, code: string) => Response.json({ error: { code, message: "Read aloud is unavailable. Use this device’s voice or try again." } }, { status, headers });

/** Public capability metadata only; never sends server configuration or credentials. */
export function GET(request: Request) {
  // Cache Components can prerender pure GETs. A request-time read keeps provider
  // configuration live when credentials are supplied after the production build.
  void request.url;
  return Response.json({ provider: azureSpeechAvailable() ? "azure" : "browser" }, { headers });
}

export async function POST(request: Request): Promise<Response> {
  let value: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return failure(400, "invalid_request");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      size += chunk.length;
      if (size > 16_384) { await reader.cancel(); return failure(413, "invalid_request"); }
      chunks.push(chunk);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    value = JSON.parse(new TextDecoder().decode(body));
  } catch { return failure(400, "invalid_request"); }
  const parsed = Input.safeParse(value);
  if (!parsed.success || !speechLanguage(parsed.data.language)) return failure(400, "invalid_request");
  if (!azureSpeechAvailable()) return failure(503, "speech_unavailable");
  try {
    return new Response(await synthesizeSpeech(parsed.data.text, parsed.data.language, request.signal), {
      headers: { ...headers, "Content-Type": "audio/mpeg" },
    });
  } catch { return failure(502, "speech_unavailable"); }
}
