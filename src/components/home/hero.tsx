import Link from "next/link";
import { HeroExchange } from "./hero-exchange";
import { ArrowDown, ArrowRight } from "./icons";

export function Hero() {
  return (
    <section data-phone-screen="hero" aria-labelledby="hero-title" className="page-melt-down on-navy relative isolate overflow-hidden text-white">
      {/* Where the Rod of Asclepius stands (drawn by heartbeat-journey.tsx, which turns it into the
          page's pulse as you scroll). Medicine first, the phone in front of it. */}
      <div
        aria-hidden="true"
        data-emblem-slot
        className="pointer-events-none absolute inset-y-8 left-[calc(50%-2.5rem)] -z-10 hidden w-44 xl:block"
      />

      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-44 pt-6 sm:gap-6 sm:px-8 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-64 lg:pt-20">
        <div data-emblem-copy>
          <h1
            id="hero-title"
            className="rise font-display text-[clamp(2.9rem,11vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]"
          >
            Every patient, <span className="text-blue">understood.</span>
          </h1>
          <p
            className="rise mt-4 max-w-[34rem] text-lg leading-relaxed text-on-navy-soft sm:hidden"
            style={{ ["--i" as string]: 1 }}
          >
            One shared device helps patients express their needs and clinicians respond across language, hearing, and speech barriers.
          </p>
          <p
            className="rise mt-6 hidden max-w-[34rem] text-xl leading-relaxed text-on-navy-soft sm:block"
            style={{ ["--i" as string]: 1 }}
          >
            Communication barriers shouldn&rsquo;t stop a clinical conversation. Synapse brings
            speech, text, pictures, and translated replies to one shared device, helping patients
            explain their needs and clinicians respond. No patient download or account required.
          </p>
          <div className="rise mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-9" style={{ ["--i" as string]: 2 }}>
            <Link
              href="/dashboard"
              className="press inline-flex min-h-14 items-center gap-3 rounded-full bg-blue py-2 pl-8 pr-2.5 text-lg font-semibold text-navy shadow-lift hover:bg-white"
            >
              Start a session
              <span className="grid size-10 place-items-center rounded-full bg-navy/10">
                <ArrowRight size={20} />
              </span>
            </Link>
            <a
              href="#how"
              className="press hidden min-h-12 items-center gap-2 rounded-full px-4 text-base font-semibold text-blue hover:bg-navy-raised hover:text-white sm:inline-flex sm:min-h-14 sm:px-5"
            >
              See a visit, step by step
              <ArrowDown size={18} />
            </a>
          </div>
          <p className="rise mt-10 hidden max-w-[30rem] text-sm text-on-navy-soft lg:block" style={{ ["--i" as string]: 3 }}>
            Built to support the conversation. This walkthrough uses fictional patient examples.
          </p>
        </div>

        {/* Small screens: the hero's own phone. Large screens: the page's pinned phone sits here (phone-rail.tsx). */}
        <div className="rise lg:hidden" style={{ ["--i" as string]: 2 }}>
          <HeroExchange />
          <a
            href="#how"
            className="press mx-auto mt-8 flex min-h-12 w-fit items-center gap-2 rounded-full px-4 text-base font-semibold text-blue hover:bg-navy-raised hover:text-white sm:hidden"
          >
            See a visit, step by step
            <ArrowDown size={18} />
          </a>
          <p className="mt-8 text-center text-sm text-on-navy-soft lg:hidden">
            Built to support the conversation. This walkthrough uses fictional patient examples.
          </p>
        </div>
        <div aria-hidden="true" className="hidden min-h-[calc(100svh-12rem)] lg:block" />
      </div>
    </section>
  );
}
