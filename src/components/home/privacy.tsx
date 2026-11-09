import { Clear, IdMasked, Shield } from "./icons";

const kept = [
  {
    icon: <Shield size={22} />,
    title: "Patient messages stay in the session",
    body: "Answers and messages are held in browser memory while the session is open. Synapse does not save them as patient or visit records.",
  },
  {
    icon: <Clear size={22} />,
    title: "Clear the conversation when you’re done",
    body: "End the session or use the Clear button to remove its messages. Inactive sessions clear automatically, too.",
  },
  {
    icon: <IdMasked size={22} />,
    title: "No personal details needed",
    body: "Patients can describe how they feel without giving a name, ID, date of birth, or address. Prompts ask them to leave these details out, and the AI is instructed to omit them.",
  },
];

const limits = [
  "Review the original message, translation, and read-back to check meaning with the patient.",
  "Clinicians make all care decisions. Synapse does not diagnose conditions and is not a certified interpreter.",
  "Text is processed by translation and AI services. Please leave out names and personal details; free speech can still include them.",
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
            Focus on the conversation.
          </h2>
          <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-ink-soft">
            Built for clinic conversations without creating patient records. Messages stay in the
            open session; only the clinician&rsquo;s own profile is saved to their account. Patients
            need no account or download.
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
            <h3 className="font-display text-xl font-bold">Here to help you communicate</h3>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Synapse brings translation and accessible input into one workflow, helping patients
              explain their needs and clinicians respond. It supports the conversation while keeping
              these limits clear.
            </p>
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
