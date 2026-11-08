"use client";

import { LoadingStatus } from "@/components/ui/spinner";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, type ReactNode } from "react";
import { useClinician } from "./api";

/** UX gate in addition to request-time server authorization. Remount on account changes. */
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
  return <Fragment key={me.id}>{children}</Fragment>;
}
