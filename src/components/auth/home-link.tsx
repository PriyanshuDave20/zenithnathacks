"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useClinician } from "./api";

/** Home is the clinician workspace once signed in; the landing page is for signed-out visitors. */
export function HomeLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const clinician = useClinician();
  return <Link {...props} href={clinician === null ? "/" : "/start"} />;
}
