import { Suspense } from "react";
import { ClinicianGate } from "@/components/auth/server-gate";
import type { Metadata } from "next";
import { RequireClinician } from "@/components/auth/require-clinician";
import { ClinicianDashboard } from "@/components/dashboard/clinician-dashboard";

export const metadata: Metadata = {
  title: "Your home · Synapse",
  description: "Your clinician home. Start a conversation or manage your profile.",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <ClinicianGate next="/dashboard">
        <RequireClinician next="/dashboard">
          <ClinicianDashboard />
        </RequireClinician>
      </ClinicianGate>
    </Suspense>
  );
}
