import Link from "next/link";
import { SynapseMark3D } from "@/components/brand/synapse-mark-3d";
import { ArrowRight } from "./icons";

export function Closing() {
  return (
    <footer className="on-navy relative -mt-px bg-navy text-white">
      <section aria-labelledby="closing-title" className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center sm:px-8 lg:pt-32">
        <SynapseMark3D className="mx-auto h-40 w-[8.6rem] sm:h-52 sm:w-[11.2rem]" />
        <h2
          id="closing-title"
          className="mx-auto mt-12 max-w-[16ch] font-display text-[clamp(2.25rem,6vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]"
        >
          Start a clearer conversation.
        </h2>
        <p className="mx-auto mt-5 max-w-[32rem] text-lg leading-relaxed text-on-navy-soft">
          See how one device connects patient input, clinician review, and a reply the patient can
          understand. Sign in to try a session.
        </p>
        <Link
          href="/dashboard"
          className="press mt-10 inline-flex min-h-14 items-center gap-3 rounded-full bg-blue py-2 pl-8 pr-2.5 text-lg font-semibold text-navy hover:bg-white"
        >
          Start a session
          <span className="grid size-10 place-items-center rounded-full bg-navy/10">
            <ArrowRight size={20} />
          </span>
        </Link>
      </section>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-on-navy-soft sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Synapse · Built at NatHacks 2026</p>
          <p>Helping patients and clinicians communicate. Demo uses fictional patient examples.</p>
        </div>
      </div>
    </footer>
  );
}
