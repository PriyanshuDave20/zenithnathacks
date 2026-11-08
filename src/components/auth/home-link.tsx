"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useClinician } from "./api";

/** Signed-in Home opens the clinician dashboard; signed-out Home opens the public landing. */
export function HomeLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const clinician = useClinician();
  return <Link {...props} href={clinician === null ? "/" : "/dashboard"} />;
}
