import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset your password · Synapse" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
