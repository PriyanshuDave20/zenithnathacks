import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Choose a new password · Synapse", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function ResetPasswordPage() { return <ResetPasswordForm />; }
