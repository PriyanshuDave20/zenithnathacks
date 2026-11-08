import type { ApiError } from "../../../lib/contracts";
import { metrics } from "../../../lib/server/metrics";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const MAX_BODY_BYTES = 1024;
const failure = (status: number, code = "invalid_request") => Response.json({
  error: { code, message: status === 500 ? "Metrics are unavailable." : "Provide a valid metrics event." },
} satisfies ApiError, { status, headers });

export async function POST(request: Request): Promise<Response> {
  let value: unknown;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  try {
    if (request.signal.aborted) return failure(400);
    reader = request.body?.getReader();
    if (!reader) return failure(400);
    request.signal.addEventListener("abort", cancel, { once: true });
    const body = new Uint8Array(MAX_BODY_BYTES);
    let size = 0;
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (request.signal.aborted) return failure(400);
      if (done) break;
      if (chunk.length > MAX_BODY_BYTES - size) {
        await reader.cancel().catch(() => {});
        return failure(413);
      }
      body.set(chunk, size);
      size += chunk.length;
    }
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body.subarray(0, size)));
  } catch {
    return failure(400);
  } finally {
    request.signal.removeEventListener("abort", cancel);
    reader?.releaseLock();
  }
  if (request.signal.aborted) return failure(400);
  try {
    if (!metrics.record(value)) return failure(400);
    return new Response(null, { status: 204, headers });
  } catch {
    return failure(500, "metrics_unavailable");
  }
}
