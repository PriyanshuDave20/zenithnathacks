"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingStatus } from "@/components/ui/spinner";
import { useClinician } from "./api";

/** Resolve the server-backed clinician session before exposing the public landing page. */
export function LoggedOutHome({ children }: { children: ReactNode }) {
  const clinician = useClinician();
  const router = useRouter();
  const signedIn = clinician !== null && clinician !== "loading";

  useEffect(() => {
    if (signedIn) router.replace("/dashboard");
  }, [signedIn, router]);

  if (clinician !== null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground">
        <LoadingStatus label={signedIn ? "Taking you home" : "Checking your account"} />
      </div>
    );
  }
  return children;
}
