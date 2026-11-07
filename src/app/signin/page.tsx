import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Sign in · Synapse" };

export default function SignInPage() {
  return <SignInForm />;
}
