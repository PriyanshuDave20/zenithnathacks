import { ClinicianGate } from "@/components/auth/server-gate";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfilePage } from "@/components/auth/profile";

export const metadata: Metadata = { title: "Your profile · Synapse" };

export default function Profile() {
  // useSearchParams (the post-sign-up welcome note) needs a Suspense boundary on prerendered routes.
  return (
    <Suspense fallback={null}>
      <ClinicianGate next="/profile"><ProfilePage /></ClinicianGate>
    </Suspense>
  );
}
