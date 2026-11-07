"use client";

import { LoadingStatus } from "@/components/ui/spinner";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useClinician } from "./api";

/**
 * Client-side gate for clinician-only pages. With the mock this is the only gate; when the account service lands,
 * Backend 1 also enforces it on the server (Next.js proxy / route checks), and this stays as the UX layer.
 */
export function RequireClinician({ children, next }: { children: ReactNode; next: string }) {
  const me = useClinician();
  const router = useRouter();

  useEffect(() => {
    if (me === null) router.replace(`/signin?next=${encodeURIComponent(next)}`);
  }, [me, next, router]);

  if (me === "loading" || me === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground">
        <LoadingStatus label={me === null ? "Taking you to sign in" : "Checking your account"} />
      </div>
    );
  }
  return <>{children}</>;
}
