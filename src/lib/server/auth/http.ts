import { createHmac, randomBytes } from "node:crypto";

export class AuthHttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const noStoreHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function authError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: noStoreHeaders });
}
export function safeAuthNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\x00-\x20\x7f]/.test(raw)
    || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(raw)) return "/dashboard";
  return raw;
}
export function checkOrigin(request: Request, baseURL: string): void {
  if (request.headers.get("origin") !== baseURL || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AuthHttpError(403, "forbidden", "This request is not allowed.");
  }
}

/** Enforce the byte cap while streaming, including absent or dishonest Content-Length. */
export async function readAuthBody(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new AuthHttpError(400, "invalid_request", "Check the account details and try again.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AuthHttpError(400, "invalid_request", "Check the account details and try again.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      if (request.signal.aborted) throw new Error("aborted");
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel().catch(() => {});
        throw new AuthHttpError(413, "too_large", "The account request is too large.");
      }
      chunks.push(value);
    }
    if (request.signal.aborted) throw new Error("aborted");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof AuthHttpError) throw error;
    throw new AuthHttpError(400, "invalid_request", "Check the account details and try again.");
  } finally { reader.releaseLock(); }
}

/** Bounded, process-local abuse protection; no IPs or raw account identifiers retained. */
export function createAuthLimiter(now: () => number = Date.now) {
  const secret = randomBytes(32);
  const buckets = new Map<string, { count: number; expires: number }>();
  const limits: Record<string, number> = { signup: 10, signin: 60, "forgot-password": 10, "reset-password": 20, google: 20, signout: 120, me: 120 };
  return (action: string, account?: string) => {
    const time = now();
    for (const [key, value] of buckets) if (value.expires <= time) buckets.delete(key);
    const globalKey = `action:${action}`;
    const accountKey = account ? `${action}:${createHmac("sha256", secret).update(account).digest("hex")}` : null;
    for (const [key, max] of [[globalKey, limits[action] ?? 60], ...(accountKey ? [[accountKey, 8] as const] : [])] as const) {
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= 2048) throw new AuthHttpError(429, "rate_limited", "Please wait a minute and try again.");
        bucket = { count: 0, expires: time + 60_000 };
        buckets.set(key, bucket);
      }
      if (++bucket.count > max) throw new AuthHttpError(429, "rate_limited", "Please wait a minute and try again.");
    }
  };
}
export function responseHeaders(source?: Response): Headers {
  const headers = new Headers(noStoreHeaders);
  for (const cookie of source?.headers.getSetCookie() ?? []) headers.append("Set-Cookie", cookie);
  return headers;
}
