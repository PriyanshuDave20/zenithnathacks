import { Clear, IdMasked, Shield } from "./icons";

const kept = [
  {
    icon: <Shield size={22} />,
    title: "Lives in memory only",
    body: "The session exists in the open browser tab. There are no patient, visit, or message records anywhere.",
  },
  {
    icon: <Clear size={22} />,
    title: "Cleared three ways",
    body: "At the end of the visit, with the Clear button, or automatically after a period of inactivity.",
  },
  {
    icon: <IdMasked size={22} />,
    title: "No identifiers asked",
    body: "No names, IDs, dates of birth, or addresses. Patients are asked not to say them, and the AI is instructed to leave them out of every summary.",
  },
];

const limits = [
  "A communication aid, not a diagnostic tool. Clinicians make every clinical decision.",
  "Not a certified interpreter. The original words and a back-translation are always shown so reliability can be judged.",
  "Text is sent to an AI model to translate it. Synapse is designed to avoid identifiable data, but free speech can still contain it.",
];

export function Privacy() {
  return (
    <section id="privacy" data-phone-screen="privacy" aria-labelledby="privacy-title" className="page-melt-up">
      {/* Large screens: one column beside the pinned phone, which shows the cleared session */}
      <div className="mx-auto grid max-w-6xl gap-14 px-4 pb-56 pt-24 sm:px-8 lg:gap-12 lg:pb-80 lg:pt-32 lg:pr-[calc(26rem+2rem)]">
        <div>
          <h2
            id="privacy-title"
            className="max-w-[14ch] font-display text-[clamp(2.25rem,6vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]"
          >
            Nothing about the patient is kept.
          </h2>
          <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-ink-soft">
            Synapse is built so there is nothing to leak: no patient accounts, no patient records, no history. Only clinicians have an account, and it holds only their own details.
          </p>
        </div>

        <div>
          <ul className="divide-y divide-line border-y border-line">
            {kept.map((k) => (
              <li key={k.title} className="flex gap-5 py-7">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-soft text-blue-deep">
                  {k.icon}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold">{k.title}</h3>
                  <p className="mt-1.5 max-w-[34rem] text-base leading-relaxed text-ink-soft">{k.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-12 rounded-[2rem] bg-ground-2 p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold">What Synapse is not</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {limits.map((t) => (
                <li key={t} className="flex gap-3 text-base leading-relaxed text-ink-soft">
                  <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue-deep" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
