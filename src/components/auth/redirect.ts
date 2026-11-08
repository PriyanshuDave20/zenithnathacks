/** Reject URL parser tricks as well as absolute URLs. */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, "https://synapse.invalid");
    return url.origin === "https://synapse.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
