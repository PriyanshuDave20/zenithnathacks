import {
  ClinicianProfileSchema, ForgotPasswordInputSchema, ProfilePatchSchema,
  ResetPasswordInputSchema, SignInInputSchema, SignUpInputSchema,
  type ClinicianProfile, type ProfilePatch,
} from "../../contracts/auth";
import { AuthUnavailable, type AuthConfig } from "./config";
import { AuthHttpError, authError, checkOrigin, createAuthLimiter, noStoreHeaders, readAuthBody, responseHeaders, safeAuthNext } from "./http";

export type AuthDependencies = {
  config: () => AuthConfig;
  call: (request: Request) => Promise<Response>;
  current: (headers: Headers) => Promise<ClinicianProfile | null>;
  patch: (headers: Headers, patch: ProfilePatch) => Promise<ClinicianProfile | null>;
  limit?: ReturnType<typeof createAuthLimiter>;
};
const invalidDetails = () => new AuthHttpError(400, "invalid_request", "Check the account details and try again.");
const invalidSignIn = () => new AuthHttpError(401, "invalid", "That email and password don’t match.");
const unavailable = () => new AuthHttpError(503, "unavailable", "Clinician accounts are temporarily unavailable. Please try again later.");

/** Public routes retain the product contract; native library endpoints stay private. */
export function createAuthHandlers(deps: AuthDependencies) {
  const limit = deps.limit ?? createAuthLimiter();
  function wrap(fn: (request: Request) => Promise<Response>) {
    return async (request: Request): Promise<Response> => {
      try { return await fn(request); }
      catch (error) {
        if (error instanceof AuthHttpError) return authError(error.status, error.code, error.message);
        if (error instanceof AuthUnavailable) return authError(503, "unavailable", "Clinician accounts need server configuration. Please try again later.");
        return authError(503, "unavailable", "Clinician accounts are temporarily unavailable. Please try again later.");
      }
    };
  }
  async function native(request: Request, path: string, body: unknown, config: AuthConfig): Promise<Response> {
    const headers = new Headers({ "Content-Type": "application/json", Origin: config.baseURL });
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
    return deps.call(new Request(`${config.baseURL}/api/auth${path}`, {
      method: "POST", headers, body: JSON.stringify(body), signal: request.signal,
    }));
  }
  async function login(request: Request, signup: boolean): Promise<Response> {
    const config = deps.config();
    checkOrigin(request, config.baseURL);
    const body = await readAuthBody(request);
    const parsed = signup ? SignUpInputSchema.safeParse(body) : SignInInputSchema.safeParse(body);
    if (!parsed.success) {
      if (signup && typeof body === "object" && body !== null && "password" in body
        && typeof body.password === "string" && body.password.length < 8) {
        throw new AuthHttpError(400, "weak_password", "Use at least 8 characters.");
      }
      throw signup ? invalidDetails() : invalidSignIn();
    }
    limit(signup ? "signup" : "signin", parsed.data.email);
    const result = await native(request, signup ? "/sign-up/email" : "/sign-in/email", parsed.data, config);
    if (!result.ok) {
      if (!signup && result.status === 401) throw invalidSignIn();
      if (signup && result.status === 422) {
        const error = await result.json().catch(() => null);
        if (error?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
          throw new AuthHttpError(409, "exists", "An account with this email already exists. Sign in instead.");
        }
      }
      if (result.status === 429) throw new AuthHttpError(429, "rate_limited", "Please wait a minute and try again.");
      if (!signup && result.status < 500) throw invalidSignIn();
      throw unavailable();
    }
    const data = await result.json();
    // Do not return the native token, verification flags, dates, image or account records.
    const profile = ClinicianProfileSchema.parse({
      id: data.user.id, email: data.user.email, name: data.user.name,
      role: data.user.role, clinic: data.user.clinic, languages: data.user.languages,
      provider: "password", plan: { name: "Demo access", status: "active", renews: "not scheduled" },
    });
    return Response.json(profile, { headers: responseHeaders(result) });
  }
  return {
    signup: wrap((request) => login(request, true)),
    signin: wrap((request) => login(request, false)),
    signout: wrap(async (request) => {
      const config = deps.config();
      checkOrigin(request, config.baseURL);
      limit("signout");
      if (request.body) {
        const body = await readAuthBody(request);
        if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length) throw invalidDetails();
      }
      const result = await native(request, "/sign-out", {}, config);
      if (!result.ok) throw unavailable();
      return new Response(null, { status: 204, headers: responseHeaders(result) });
    }),
    me: wrap(async (request) => {
      const profile = await deps.current(request.headers);
      if (!profile) return authError(401, "invalid", "Sign in to your clinician account.");
      return Response.json(ClinicianProfileSchema.parse(profile), { headers: noStoreHeaders });
    }),
    update: wrap(async (request) => {
      const config = deps.config();
      checkOrigin(request, config.baseURL);
      const parsed = ProfilePatchSchema.safeParse(await readAuthBody(request));
      if (!parsed.success) throw invalidDetails();
      limit("me");
      const profile = await deps.patch(request.headers, parsed.data);
      if (!profile) return authError(401, "invalid", "Sign in to your clinician account.");
      return Response.json(ClinicianProfileSchema.parse(profile), { headers: noStoreHeaders });
    }),
    forgotPassword: wrap(async (request) => {
      const config = deps.config();
      checkOrigin(request, config.baseURL);
      if (!config.passwordReset) throw new AuthHttpError(503, "unavailable", "Password reset email is not configured yet. Contact your clinic administrator.");
      const parsed = ForgotPasswordInputSchema.safeParse(await readAuthBody(request));
      if (!parsed.success) throw invalidDetails();
      limit("forgot-password", parsed.data.email);
      // Delivery/provider errors must not distinguish an existing account from an unknown one.
      await native(request, "/request-password-reset", { ...parsed.data, redirectTo: `${config.baseURL}/reset-password` }, config).catch(() => {});
      return new Response(null, { status: 204, headers: noStoreHeaders });
    }),
    resetPassword: wrap(async (request) => {
      const config = deps.config();
      checkOrigin(request, config.baseURL);
      if (!config.passwordReset) throw new AuthHttpError(503, "unavailable", "Password reset email is not configured yet. Contact your clinic administrator.");
      const parsed = ResetPasswordInputSchema.safeParse(await readAuthBody(request));
      if (!parsed.success) throw invalidDetails();
      limit("reset-password");
      const result = await native(request, "/reset-password", parsed.data, config);
      if (result.status >= 500) throw unavailable();
      if (result.status === 429) throw new AuthHttpError(429, "rate_limited", "Please wait a minute and try again.");
      if (!result.ok) throw new AuthHttpError(400, "invalid_token", "This reset link is invalid or expired. Request a new link.");
      return new Response(null, { status: 204, headers: responseHeaders(result) });
    }),
    capabilities: wrap(async (request) => {
      // Touch the request so Cache Components never prerenders deployment configuration.
      void request.url;
      try {
        const config = deps.config();
        return Response.json({ google: config.google, passwordReset: config.passwordReset }, { headers: noStoreHeaders });
      } catch (error) {
        if (!(error instanceof AuthUnavailable)) throw error;
        return Response.json({ google: false, passwordReset: false }, { headers: noStoreHeaders });
      }
    }),
    google: wrap(async (request) => {
      const config = deps.config();
      if (!config.google) throw new AuthHttpError(503, "unavailable", "Google sign-in is not configured yet. Use email and password.");
      const origin = request.headers.get("origin");
      if ((origin && origin !== config.baseURL) || request.headers.get("sec-fetch-site") === "cross-site") {
        throw new AuthHttpError(403, "forbidden", "This request is not allowed.");
      }
      limit("google");
      const next = safeAuthNext(new URL(request.url).searchParams.get("next"));
      const result = await native(request, "/sign-in/social", {
        provider: "google", callbackURL: `${config.baseURL}${next}`,
        errorCallbackURL: `${config.baseURL}/signin?auth=google_failed`, disableRedirect: true,
      }, config);
      if (!result.ok) throw unavailable();
      const { url } = await result.json();
      const destination = new URL(url);
      if (destination.protocol !== "https:" || destination.hostname !== "accounts.google.com") throw unavailable();
      const headers = responseHeaders(result);
      headers.set("Location", destination.href);
      return new Response(null, { status: 302, headers });
    }),
    callback: wrap(async (request) => {
      const url = new URL(request.url);
      // No catch-all access to native sign-up, update-user, account linking or token APIs.
      if (request.method !== "GET" || url.pathname !== "/api/auth/callback/google") {
        return authError(404, "not_found", "This account endpoint was not found.");
      }
      const config = deps.config();
      if (!config.google) throw unavailable();
      if (url.search.length > 8192) throw invalidDetails();
      const headers = new Headers();
      const cookie = request.headers.get("cookie");
      if (cookie) headers.set("cookie", cookie);
      const result = await deps.call(new Request(`${config.baseURL}${url.pathname}${url.search}`, { headers, signal: request.signal }));
      const location = result.headers.get("location");
      if (!location) throw unavailable();
      const destination = new URL(location, config.baseURL);
      if (destination.origin !== config.baseURL) throw unavailable();
      // Better Auth validates signed state/PKCE and binds callback to the initiating browser.
      const output = responseHeaders(result);
      output.set("Location", destination.pathname === "/api/auth/error" ? `${config.baseURL}/signin?auth=google_failed` : destination.href);
      return new Response(null, { status: 302, headers: output });
    }),
  };
}
