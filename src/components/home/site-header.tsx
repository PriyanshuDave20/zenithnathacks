import Link from "next/link";
import { SynapseMark, SynapseWordmark } from "@/components/brand/synapse-logo";
import { AccountLink } from "@/components/auth/account-link";
import { ArrowRight } from "./icons";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#modes", label: "Patient modes" },
  { href: "#privacy", label: "Privacy" },
];

export function SiteHeader() {
  return (
    <header data-site-header className="on-navy sticky top-0 z-50 border-b border-white/10 bg-navy/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Synapse home">
          <SynapseMark className="h-9 w-auto" />
          <SynapseWordmark className="hidden h-[0.9rem] w-auto min-[360px]:block" />
        </Link>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="rounded-full px-4 py-2.5 text-base font-medium text-on-navy-soft transition-colors hover:bg-navy-raised hover:text-white"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <AccountLink />
          <Link
            href="/start"
            className="press inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-base font-semibold text-blue ring-1 ring-blue/60 hover:bg-navy-raised hover:text-white"
          >
            Start
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
