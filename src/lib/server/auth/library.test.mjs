// Runs only synthetic, isolated in-memory Better Auth instances. No environment or database is read.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const output = mkdtempSync(join(tmpdir(), "synapse-auth-library-"));
const sources = ["src/lib/contracts/auth.ts", ...["options", "email", "config", "http", "service"].map(name => `src/lib/server/auth/${name}.ts`)];
for (const file of sources) {
  const target = join(output, file.replace(/\.ts$/, ".mjs"));
  mkdirSync(dirname(target), { recursive: true });
  let code = ts.transpileModule(readFileSync(join(root, file), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  code = code.replace(/from "(\.[^"]+)"/g, (_, path) => `from "${path}.mjs"`).replace(/from "zod"/g, `from "${import.meta.resolve("zod")}"`);
  writeFileSync(target, code);
}
const { authOptions } = await import(pathToFileURL(join(output, "src/lib/server/auth/options.mjs")).href);
const { createAuthHandlers } = await import(pathToFileURL(join(output, "src/lib/server/auth/service.mjs")).href);
const baseURL = "https://app.example.invalid";
const config = { baseURL, secret: "synthetic-offline-auth-secret-over-32-characters", google: false, passwordReset: true, resendKey: "synthetic", emailFrom: "fixture@example.invalid" };
const signup = { email: "fixture@example.invalid", password: "synthetic-password", name: "Synthetic Clinician", role: "doctor", clinic: "Synthetic clinic" };
const cookieHeader = (response) => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
const request = (path, body, cookie) => new Request(`${baseURL}/api/auth${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: baseURL, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
});

try {
  await test("actual Better Auth signs cookies, hashes passwords, persists clinician-only fields, rejects wrong credentials and revokes sessions", async () => {
    const memory = { Clinician: [], ClinicianSession: [], ClinicianAccount: [], ClinicianVerification: [] };
    const options = authOptions(config);
    const auth = betterAuth({ ...options, database: memoryAdapter(memory), emailAndPassword: { ...options.emailAndPassword, sendResetPassword: async () => {} } });
    const result = await auth.handler(request("/sign-up/email", signup));
    assert.equal(result.status, 200);
    const data = await result.json();
    assert.ok(data.user.id);
    assert.equal(data.user.role, "doctor");
    assert.deepEqual(data.user.languages, ["en"]);
    const cookie = cookieHeader(result);
    assert.match(result.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(result.headers.get("set-cookie"), /Secure/i);
    assert.match(result.headers.get("set-cookie"), /SameSite=Lax/i);
    assert.match(result.headers.get("set-cookie"), /Max-Age=28800/i);
    assert.ok(memory.ClinicianAccount[0].password);
    assert.notEqual(memory.ClinicianAccount[0].password, signup.password);
    assert.equal(memory.ClinicianSession[0].ipAddress, null);
    assert.equal(memory.ClinicianSession[0].userAgent, null);
    assert.equal(memory.ClinicianAccount[0].accessToken, null);
    assert.equal(memory.ClinicianAccount[0].idToken, null);
    const session = await auth.api.getSession({ headers: new Headers({ Cookie: cookie }), query: { disableCookieCache: true, disableRefresh: true } });
    assert.equal(session.user.id, data.user.id);
    assert.equal(await auth.api.getSession({ headers: new Headers({ Cookie: `${cookie}forged` }) }), null);
    const wrong = await auth.handler(request("/sign-in/email", { email: signup.email, password: "wrong-synthetic" }));
    const unknown = await auth.handler(request("/sign-in/email", { email: "missing@example.invalid", password: "wrong-synthetic" }));
    assert.equal(wrong.status, 401);
    assert.deepEqual(await wrong.json(), await unknown.json());
    const login = await auth.handler(request("/sign-in/email", { email: signup.email, password: signup.password }));
    assert.equal(login.status, 200);
    const nextCookie = cookieHeader(login);
    assert.equal((await auth.handler(request("/sign-out", {}, nextCookie))).status, 200);
    assert.equal(await auth.api.getSession({ headers: new Headers({ Cookie: nextCookie }) }), null);
    memory.ClinicianSession[0].expiresAt = new Date(Date.now() - 1000);
    assert.equal(await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) }), null);
    const csrf = await auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" }, body: JSON.stringify({ ...signup, email: "other@example.invalid" }) }));
    assert.equal(csrf.status, 403);
  });
  await test("actual reset tokens expire, are consumed once, change the password and revoke existing sessions", async () => {
    const memory = { Clinician: [], ClinicianSession: [], ClinicianAccount: [], ClinicianVerification: [] };
    let token;
    const options = authOptions(config);
    const auth = betterAuth({ ...options, database: memoryAdapter(memory), emailAndPassword: { ...options.emailAndPassword, sendResetPassword: async (data) => { token = data.token; } } });
    const result = await auth.handler(request("/sign-up/email", signup));
    assert.equal(result.status, 200);
    const cookie = cookieHeader(result);
    assert.equal((await auth.handler(request("/request-password-reset", { email: signup.email }))).status, 200);
    assert.ok(token);
    assert.equal(memory.ClinicianVerification[0].identifier.includes(token), false);
    memory.ClinicianVerification[0].expiresAt = new Date(Date.now() - 1000);
    assert.equal((await auth.handler(request("/reset-password", { token, newPassword: "new-synthetic-password" }))).status, 400);
    assert.equal((await auth.handler(request("/request-password-reset", { email: signup.email }))).status, 200);
    const freshToken = token;
    assert.equal((await auth.handler(request("/reset-password", { token: freshToken, newPassword: "new-synthetic-password" }))).status, 200);
    assert.equal((await auth.handler(request("/reset-password", { token: freshToken, newPassword: "second-synthetic-password" }))).status, 400);
    assert.equal(await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) }), null);
    assert.equal((await auth.handler(request("/sign-in/email", { email: signup.email, password: signup.password }))).status, 401);
    assert.equal((await auth.handler(request("/sign-in/email", { email: signup.email, password: "new-synthetic-password" }))).status, 200);
  });
  await test("actual Google callback rejects forged/missing state without provider calls or accounts", async () => {
    const memory = { Clinician: [], ClinicianSession: [], ClinicianAccount: [], ClinicianVerification: [] };
    const auth = betterAuth({ ...authOptions({ ...config, google: true, googleClientId: "synthetic-client", googleClientSecret: "synthetic-secret" }), database: memoryAdapter(memory) });
    const previousFetch = globalThis.fetch;
    let providerCalls = 0;
    globalThis.fetch = async () => { providerCalls++; throw new Error("No external transport in fixture"); };
    try {
      const result = await auth.handler(new Request(`${baseURL}/api/auth/callback/google?state=forged&code=synthetic`));
      assert.equal(result.status, 302);
      assert.equal(new URL(result.headers.get("location")).origin, baseURL);
      assert.equal(providerCalls, 0);
      assert.equal(memory.Clinician.length, 0);
      assert.equal(memory.ClinicianSession.length, 0);
    } finally { globalThis.fetch = previousFetch; }
  });
  await test("public wrapper works against the real auth library and never returns its bearer token", async () => {
    const memory = { Clinician: [], ClinicianSession: [], ClinicianAccount: [], ClinicianVerification: [] };
    const auth = betterAuth({ ...authOptions({ ...config, passwordReset: false }), database: memoryAdapter(memory) });
    const handlers = createAuthHandlers({
      config: () => ({ ...config, passwordReset: false }), call: req => auth.handler(req),
      current: async () => null, patch: async () => null,
    });
    const result = await handlers.signup(request("/signup", signup));
    assert.equal(result.status, 200);
    const data = await result.json();
    assert.deepEqual(Object.keys(data).sort(), ["clinic", "email", "id", "languages", "name", "plan", "provider", "role"]);
    assert.equal(data.provider, "password");
    assert.match(result.headers.get("set-cookie"), /HttpOnly/i);
    const login = await handlers.signin(request("/signin", { email: signup.email, password: signup.password }));
    assert.equal(login.status, 200);
    assert.equal((await login.json()).id, data.id);
  });
} finally { rmSync(output, { recursive: true, force: true }); }
