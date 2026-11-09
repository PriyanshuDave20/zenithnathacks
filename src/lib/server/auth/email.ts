import type { AuthConfig } from "./config";

/** Clinician reset mail only, through the fixed HTTPS Resend API; no patient content. */
export async function sendClinicianResetEmail(config: AuthConfig, email: string, token: string, transport: typeof fetch = fetch): Promise<void> {
  if (!config.passwordReset || !config.resendKey || !config.emailFrom) throw new Error("Reset email unavailable");
  const url = new URL("/reset-password", config.baseURL);
  url.hash = new URLSearchParams({ token }).toString();
  const result = await transport("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.emailFrom, to: [email], subject: "Reset your Synapse clinician password",
      text: `Choose a new password for your clinician account: ${url.href}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this message.`,
    }),
    cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  await result.body?.cancel();
  if (!result.ok) throw new Error("Reset email unavailable");
}
