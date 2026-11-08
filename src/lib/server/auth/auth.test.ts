import assert from "node:assert/strict";
import { test } from "node:test";
import { ClinicianProfileSchema, ProfilePatchSchema, SignUpInputSchema, type ClinicianProfile } from "../../contracts/auth";
import { AuthUnavailable, readAuthConfig, type AuthConfig } from "./config";
import { AuthHttpError, createAuthLimiter, readAuthBody, safeAuthNext } from "./http";
import { sendClinicianResetEmail } from "./email";
import { createAuthHandlers, type AuthDependencies } from "./service";

const baseURL = "http://localhost:3000";
const config: AuthConfig = { baseURL, secret: "offline-fixture-secret-at-least-32-characters", google: false, passwordReset: false };
const profile: ClinicianProfile = {
  id: "synthetic-clinician", email: "fixture@example.invalid", name: "Synthetic Clinician", role: "doctor", clinic: "Demo clinic", languages: ["en"],
  plan: { name: "Demo access", status: "active", renews: "not scheduled" }, provider: "password",
};
const signup = { email: profile.email, password: "synthetic-password", name: profile.name, role: profile.role, clinic: profile.clinic };
const request = (path: string, body: unknown, origin = baseURL) => new Request(`${baseURL}${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: "synthetic-session" }, body: JSON.stringify(body),
});
function fixture(overrides: Partial<AuthDependencies> = {}) {
  const calls: { path: string; body: unknown }[] = [];
  const deps: AuthDependencies = {
    config: () => config,
    call: async (req) => {
      calls.push({ path: new URL(req.url).pathname, body: await req.json() });
      return Response.json({ token: "MUST_NOT_LEAK", user: { ...profile, emailVerified: false, image: null } }, {
        headers: { "Set-Cookie": "synapse.session_token=synthetic; HttpOnly; SameSite=Lax; Path=/" },
      });
    },
    current: async () => profile,
    patch: async (_headers, patch) => ({ ...profile, ...patch }),
    ...overrides,
  };
  return { handlers: createAuthHandlers(deps), calls };
}

test("auth contract rejects account ownership, plan elevation and undeclared profile fields", () => {
  for (const patch of [{ id: "other" }, { email: "other@example.invalid" }, { plan: { status: "active" } }, { password: "secret" }, {}, { languages: ["en", "not a language"] }]) {
    assert.equal(ProfilePatchSchema.safeParse(patch).success, false);
  }
  assert.equal(SignUpInputSchema.safeParse({ ...signup, provider: "google" }).success, false);
  assert.deepEqual(SignUpInputSchema.parse({ ...signup, email: " FIXTURE@EXAMPLE.INVALID " }).email, profile.email);
  assert.deepEqual(ClinicianProfileSchema.parse(profile), profile);
});

test("auth configuration fails closed without trusted base URL/strong secret and restricts HTTP to local development", () => {
  for (const env of [{}, { BETTER_AUTH_SECRET: "short", BETTER_AUTH_URL: baseURL },
    ...["https://example.invalid/path", "https://user:pass@example.invalid", "http://example.invalid", "javascript:alert(1)", "https://example.invalid/?query=secret"].map(BETTER_AUTH_URL => ({ BETTER_AUTH_URL, BETTER_AUTH_SECRET: config.secret })),
    { BETTER_AUTH_URL: baseURL, BETTER_AUTH_SECRET: config.secret, NODE_ENV: "production" }]) {
    assert.throws(() => readAuthConfig(env), AuthUnavailable);
  }
  assert.equal(readAuthConfig({ BETTER_AUTH_URL: baseURL, BETTER_AUTH_SECRET: config.secret }).google, false);
  const configured = readAuthConfig({ BETTER_AUTH_URL: "https://app.example.invalid", BETTER_AUTH_SECRET: config.secret, GOOGLE_CLIENT_ID: "fixture", GOOGLE_CLIENT_SECRET: "fixture", RESEND_API_KEY: "fixture", AUTH_EMAIL_FROM: "fixture@example.invalid" });
  assert.equal(configured.google, true);
  assert.equal(configured.passwordReset, true);
});

test("auth wrappers preserve the public profile shape and cookie headers without leaking native tokens", async () => {
  const { handlers, calls } = fixture();
  for (const [handler, body] of [[handlers.signup, signup], [handlers.signin, { email: profile.email, password: signup.password }]] as const) {
    const result = await handler(request("/api/auth/fixture", body));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "private, no-store");
    assert.match(result.headers.get("set-cookie")!, /HttpOnly/);
    assert.deepEqual(await result.json(), profile);
  }
  assert.deepEqual(calls.map(call => call.path), ["/api/auth/sign-up/email", "/api/auth/sign-in/email"]);
  assert.deepEqual(calls[0].body, signup);
});

test("auth mutations reject foreign/missing origin, cross-site metadata, malformed JSON, undeclared fields and oversized streams before service calls", async () => {
  const { handlers, calls } = fixture();
  const requests = [
    request("/api/auth/signup", signup, "https://attacker.invalid"),
    new Request(`${baseURL}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup) }),
    new Request(`${baseURL}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json", Origin: baseURL, "sec-fetch-site": "cross-site" }, body: JSON.stringify(signup) }),
    new Request(`${baseURL}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json", Origin: baseURL }, body: "{" }),
    request("/api/auth/signup", { ...signup, userId: "victim" }),
    request("/api/auth/signup", { ...signup, clinic: "x".repeat(8300) }),
  ];
  for (const [i, req] of requests.entries()) {
    const result = await handlers.signup(req);
    assert.equal(result.status, [403, 403, 403, 400, 400, 413][i]);
    assert.match(result.headers.get("cache-control")!, /no-store/);
    assert.equal(JSON.stringify(await result.json()).includes(signup.password), false);
  }
  assert.equal(calls.length, 0);
});

test("auth login errors are equivalent for unknown email and wrong password; signup maps duplicate and weak passwords", async () => {
  const { handlers } = fixture({ call: async () => Response.json({ code: "INVALID_EMAIL_OR_PASSWORD", message: "native private detail" }, { status: 401 }) });
  const wrong = await handlers.signin(request("/api/auth/signin", { email: profile.email, password: "wrong" }));
  const missing = await handlers.signin(request("/api/auth/signin", { email: "missing@example.invalid", password: "wrong" }));
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), await missing.json());
  assert.equal((await handlers.signup(request("/api/auth/signup", { ...signup, password: "short" }))).status, 400);
  const duplicate = fixture({ call: async () => Response.json({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }, { status: 422 }) });
  const result = await duplicate.handlers.signup(request("/api/auth/signup", signup));
  assert.equal(result.status, 409);
  assert.equal((await result.json()).error.code, "exists");
});

test("me and profile patch use only the server session owner and return generic no-store unauthorized responses", async () => {
  let patched: unknown;
  const { handlers } = fixture({ patch: async (headers, patch) => { assert.equal(headers.get("cookie"), "synthetic-session"); patched = patch; return { ...profile, ...patch }; } });
  const result = await handlers.update(request("/api/me", { clinic: "Synthetic edited clinic", languages: ["en", "es"] }));
  assert.equal(result.status, 200);
  assert.deepEqual(patched, { clinic: "Synthetic edited clinic", languages: ["en", "es"] });
  assert.equal((await result.json()).id, profile.id);
  assert.equal((await handlers.update(request("/api/me", { id: "other", name: "Other" }))).status, 400);
  const signedOut = fixture({ current: async () => null, patch: async () => null });
  assert.equal((await signedOut.handlers.me(new Request(`${baseURL}/api/me`))).status, 401);
  assert.equal((await signedOut.handlers.update(request("/api/me", { name: "Synthetic" }))).status, 401);
});

test("signout is empty 204 and preserves the native revocation/clearing cookie", async () => {
  const { handlers, calls } = fixture({ call: async () => new Response(null, { status: 200, headers: { "Set-Cookie": "synapse.session_token=; Max-Age=0; HttpOnly; Path=/" } }) });
  const result = await handlers.signout(request("/api/auth/signout", {}));
  assert.equal(result.status, 204);
  assert.equal(await result.text(), "");
  assert.match(result.headers.get("set-cookie")!, /Max-Age=0/);
  assert.equal(calls.length, 0);
});

test("unconfigured providers are unavailable, capabilities contain booleans only, and reset request never enumerates", async () => {
  const { handlers, calls } = fixture();
  assert.equal((await handlers.google(new Request(`${baseURL}/api/auth/google`))).status, 503);
  assert.equal((await handlers.forgotPassword(request("/api/auth/forgot-password", { email: profile.email }))).status, 503);
  assert.deepEqual(await (await handlers.capabilities(new Request(`${baseURL}/api/auth/capabilities`))).json(), { google: false, passwordReset: false });
  assert.equal(calls.length, 0);
  const unavailableConfig = fixture({ config: () => { throw new AuthUnavailable(); } });
  assert.equal((await unavailableConfig.handlers.signup(request("/api/auth/signup", signup))).status, 503);
  const configured = fixture({ config: () => ({ ...config, passwordReset: true }), call: async () => { throw new Error("private delivery details"); } });
  for (const email of [profile.email, "unknown@example.invalid"]) {
    const result = await configured.handlers.forgotPassword(request("/api/auth/forgot-password", { email }));
    assert.equal(result.status, 204);
    assert.equal(await result.text(), "");
  }
});

test("reset completion delegates opaque token/new password and exposes no native error details", async () => {
  const configured = fixture({ config: () => ({ ...config, passwordReset: true }) });
  const body = { token: "synthetic_token", newPassword: "new-synthetic-password" };
  assert.equal((await configured.handlers.resetPassword(request("/api/auth/reset-password", body))).status, 204);
  assert.deepEqual(configured.calls[0], { path: "/api/auth/reset-password", body });
  const invalid = fixture({ config: () => ({ ...config, passwordReset: true }), call: async () => Response.json({ message: "secret token detail" }, { status: 400 }) });
  const result = await invalid.handlers.resetPassword(request("/api/auth/reset-password", body));
  assert.equal(result.status, 400);
  assert.equal((await result.json()).error.code, "invalid_token");
});

test("Google start fixes provider/callback destinations, retains state cookies, and native catch-all is tightly allowlisted", async () => {
  let delegated: Request | undefined;
  const { handlers, calls } = fixture({ config: () => ({ ...config, google: true }), call: async req => {
    delegated = req;
    if (new URL(req.url).pathname === "/api/auth/callback/google") {
      return new Response(null, { status: 302, headers: { Location: `${baseURL}/dashboard`, "Set-Cookie": "synapse.session_token=synthetic; HttpOnly; Path=/" } });
    }
    const body = await req.json();
    calls.push({ path: new URL(req.url).pathname, body });
    return Response.json({ url: "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic" }, { headers: { "Set-Cookie": "synapse.oauth_state=synthetic; HttpOnly; SameSite=Lax; Path=/" } });
  } });
  const result = await handlers.google(new Request(`${baseURL}/api/auth/google?next=${encodeURIComponent("//attacker.invalid")}`));
  assert.equal(result.status, 302);
  assert.match(result.headers.get("location")!, /^https:\/\/accounts.google.com\//);
  assert.match(result.headers.get("set-cookie")!, /oauth_state/);
  assert.deepEqual(calls[0].body, { provider: "google", callbackURL: `${baseURL}/dashboard`, errorCallbackURL: `${baseURL}/signin?auth=google_failed`, disableRedirect: true });
  assert.equal((await handlers.callback(new Request(`${baseURL}/api/auth/update-user`))).status, 404);
  assert.equal((await handlers.callback(request("/api/auth/callback/google", {}))).status, 404);
  const callback = await handlers.callback(new Request(`${baseURL}/api/auth/callback/google?state=synthetic&code=fixture`, { headers: { Cookie: "synthetic-state" } }));
  assert.equal(callback.status, 302);
  assert.equal(delegated!.headers.get("cookie"), "synthetic-state");
  assert.match(callback.headers.get("set-cookie")!, /session_token/);
});

test("post-auth redirect rejects authority, backslash, encoded separators and control characters", () => {
  for (const unsafe of ["https://attacker.invalid", "//attacker.invalid", "/\\attacker.invalid", "/%5cattacker.invalid", "/%2fattacker.invalid", "/\n/attacker.invalid"]) assert.equal(safeAuthNext(unsafe), "/dashboard");
  assert.equal(safeAuthNext("/profile?welcome=1"), "/profile?welcome=1");
});

test("body caps cancel oversized streams independently of Content-Length and reject aborted streams", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(8193)); },
    cancel() { cancelled = true; },
  });
  const req = new Request(`${baseURL}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "1" }, body: stream, duplex: "half" } as RequestInit);
  await assert.rejects(() => readAuthBody(req), error => error instanceof AuthHttpError && error.status === 413);
  assert.equal(cancelled, true);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => readAuthBody(new Request(`${baseURL}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: controller.signal })), AuthHttpError);
});

test("rate limiter applies per-account and process limits without trusting spoofable IP headers and resets after expiry", async () => {
  let now = 0;
  const limit = createAuthLimiter(() => now);
  for (let i = 0; i < 8; i++) limit("signin", profile.email);
  assert.throws(() => limit("signin", profile.email), error => error instanceof AuthHttpError && error.status === 429);
  now = 60_000;
  assert.doesNotThrow(() => limit("signin", profile.email));
  const { handlers } = fixture({ limit: () => { throw new AuthHttpError(429, "rate_limited", "Wait."); } });
  assert.equal((await handlers.signin(request("/api/auth/signin", { email: profile.email, password: "synthetic" }))).status, 429);
});

test("reset email sends only the clinician link to the fixed Resend endpoint with a bounded transport", async () => {
  let sent: unknown;
  const configured = { ...config, passwordReset: true, resendKey: "synthetic-key", emailFrom: "fixture@example.invalid" };
  await sendClinicianResetEmail(configured, profile.email, "synthetic_token", async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer synthetic-key");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    sent = JSON.parse(String(init?.body));
    return new Response(null, { status: 200 });
  });
  assert.deepEqual((sent as { to: string[] }).to, [profile.email]);
  assert.match((sent as { text: string }).text, /http:\/\/localhost:3000\/reset-password#token=synthetic_token/);
  await assert.rejects(() => sendClinicianResetEmail(configured, profile.email, "synthetic", async () => new Response(null, { status: 500 })), /Reset email unavailable/);
});
