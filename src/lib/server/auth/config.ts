export class AuthUnavailable extends Error {
  constructor() { super("Clinician accounts are temporarily unavailable."); }
}
export type AuthConfig = {
  baseURL: string; secret: string; google: boolean; passwordReset: boolean;
  googleClientId?: string; googleClientSecret?: string; resendKey?: string; emailFrom?: string;
};

/** A trusted, explicit origin. Never infer cookie or OAuth destinations from Host. */
export function readAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32 || !env.BETTER_AUTH_URL) throw new AuthUnavailable();
  let url: URL;
  try { url = new URL(env.BETTER_AUTH_URL); } catch { throw new AuthUnavailable(); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
    || (url.protocol !== "https:" && !(url.protocol === "http:" && local && env.NODE_ENV !== "production"))) {
    throw new AuthUnavailable();
  }
  const google = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const passwordReset = Boolean(env.RESEND_API_KEY && env.AUTH_EMAIL_FROM);
  return {
    baseURL: url.origin, secret, google, passwordReset,
    googleClientId: env.GOOGLE_CLIENT_ID, googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    resendKey: env.RESEND_API_KEY, emailFrom: env.AUTH_EMAIL_FROM,
  };
}
