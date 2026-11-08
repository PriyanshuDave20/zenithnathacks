import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentClinician } from "@/lib/server/auth";

/** Request-time authorization. Never cached or based solely on cookie presence. */
export async function ClinicianGate({ children, next }: { children: ReactNode; next: string }) {
  let clinician;
  try {
    clinician = await getCurrentClinician(await headers());
  } catch {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="font-display text-2xl font-bold">Account service unavailable</h1>
        <p className="mt-4">Please try again once clinician sign-in is configured and the database is available.</p>
        <a href="/signin" className="mt-6 inline-block underline">Return to sign in</a>
      </main>
    );
  }
  if (!clinician) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return children;
}
