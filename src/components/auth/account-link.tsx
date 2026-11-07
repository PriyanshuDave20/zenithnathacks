"use client";

import Link from "next/link";
import { useClinician } from "./api";
import { initials } from "./auth-ui";

/** Header account control on navy: "Sign in" when signed out, the clinician's initials (to /profile) when signed in. */
export function AccountLink({ compact = false }: { compact?: boolean }) {
  const me = useClinician();
  if (me === "loading") return <span aria-hidden="true" className="size-11" />;
  if (!me) {
    return (
      <Link
        href="/signin"
        className={`press inline-flex min-h-11 items-center rounded-full px-4 text-base font-semibold text-on-navy-soft hover:bg-navy-raised hover:text-white ${compact ? "" : ""}`}
      >
        Sign in
      </Link>
    );
  }
  return (
    <Link
      href="/profile"
      aria-label={`Your profile${me.name ? `, ${me.name}` : ""}`}
      className="press grid size-11 place-items-center rounded-full bg-navy-raised font-display text-base font-bold text-white ring-1 ring-white/15 hover:bg-blue hover:text-navy"
    >
      {initials(me.name, me.email)}
    </Link>
  );
}
