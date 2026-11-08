import type { BetterAuthOptions } from "better-auth";
import { ClinicianRoleSchema } from "../../contracts/auth";
import type { AuthConfig } from "./config";
import { sendClinicianResetEmail } from "./email";

/** Shared with the offline library fixture so it exercises the actual production security options. */
export function authOptions(config: AuthConfig): BetterAuthOptions {
  return {
    appName: "Synapse", baseURL: config.baseURL, basePath: "/api/auth", secret: config.secret,
    trustedOrigins: [config.baseURL], logger: { disabled: true },
    emailAndPassword: {
      enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true, resetPasswordTokenExpiresIn: 30 * 60,
      ...(config.passwordReset ? {
        sendResetPassword: async ({ user, token }) => sendClinicianResetEmail(config, user.email, token),
      } : {}),
    },
    socialProviders: config.google ? {
      google: { clientId: config.googleClientId!, clientSecret: config.googleClientSecret!, prompt: "select_account" },
    } : {},
    user: {
      modelName: "Clinician",
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "other", validator: { input: ClinicianRoleSchema } },
        clinic: { type: "string", required: false, defaultValue: "" },
        languages: { type: "string[]", required: false, defaultValue: ["en"], input: false },
      },
    },
    session: {
      modelName: "ClinicianSession", expiresIn: 8 * 60 * 60,
      disableSessionRefresh: true, cookieCache: { enabled: false },
    },
    account: {
      modelName: "ClinicianAccount", encryptOAuthTokens: true,
      accountLinking: { enabled: false }, storeStateStrategy: "cookie", storeAccountCookie: false,
    },
    verification: { modelName: "ClinicianVerification", storeIdentifier: "hashed" },
    // Custom wrapper limits run in every environment, including server-API invocations.
    // No proxy/IP headers are trusted or retained by the library.
    rateLimit: { enabled: false },
    advanced: {
      cookiePrefix: "synapse", useSecureCookies: config.baseURL.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      disableCSRFCheck: false, disableOriginCheck: false,
      ipAddress: { disableIpTracking: true },
    },
    databaseHooks: {
      user: { create: { before: async (user) => ({ data: { ...user, image: null } }) } },
      session: { create: { before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }) } },
      account: {
        create: { before: async (account) => ({ data: {
          ...account, accessToken: null, refreshToken: null, idToken: null,
          accessTokenExpiresAt: null, refreshTokenExpiresAt: null, scope: null,
        } }) },
        update: { before: async (account) => ({ data: {
          ...account, accessToken: null, refreshToken: null, idToken: null,
          accessTokenExpiresAt: null, refreshTokenExpiresAt: null, scope: null,
        } }) },
      },
    },
  };
}
