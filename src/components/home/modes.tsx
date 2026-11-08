"use client";

import { useRef, type KeyboardEvent } from "react";
import { languages, summary } from "./data";
import { Bubble } from "./phone";
import { EyeDemo } from "./eye-demo";
import { BodyPicture } from "@/components/input/body-diagram";
import { useModesState } from "./rail-store";
import {
  Captions,
  Check,
  Keyboard,
  Speaker,
} from "./icons";

type ModeId = "language" | "deaf" | "literacy" | "mute" | "eye";

export const modes: { id: ModeId; tab: string; short: string; arrives: string; intro: string }[] = [
  {
    id: "language",
    tab: "Another language",
    short: "Language",
    arrives: "Speech in the patient’s language",
    intro: "The patient speaks or types in their own language, then checks a read-back before sharing it with the clinician.",
  },
  {
    id: "deaf",
    tab: "Deaf or hard of hearing",
    short: "Deaf/HoH",
    arrives: "Typing and taps, with captions",
    intro: "Questions and replies appear as large text. The patient types or taps an answer. No audio-only cues.",
  },
  {
    id: "literacy",
    tab: "Low literacy",
    short: "Literacy",
    arrives: "Pictures, with read-aloud",
    intro: "One question at a time, answered with pictures. Read-aloud supports the questions and answers.",
  },
  {
    id: "mute",
    tab: "Can’t speak",
    short: "Can’t speak",
    arrives: "Tapped phrases, spoken aloud",
    intro: "The patient types or chooses phrases. The device can read their message aloud, and the clinician reviews it.",
  },
  {
    id: "eye",
    tab: "Eye mode",
    short: "Eye mode",
    arrives: "A choice from the communication board",
    intro: "Watch a patient look toward a choice, hold their gaze for two seconds, and confirm their message. The small cursor shows where they are looking. This simulated example uses no camera.",
  },
];

export function Panel({
  mode,
  lang,
  setLang,
  compact = false,
  setEyeChoice,
}: {
  mode: ModeId;
  lang: number;
  setLang: (n: number) => void;
  /** Inside the phone: narrow layout regardless of the viewport. */
  compact?: boolean;
  eyeChoice: string | null;
  setEyeChoice: (choice: string) => void;
}) {
  const l = languages[lang];
  switch (mode) {
    case "eye":
      return <EyeDemo compact={compact} onChoice={setEyeChoice} />;
    case "language":
      return (
        <div className="flex flex-col gap-3">
          <div role="group" aria-label="Demo language" className="flex flex-wrap gap-2">
            {languages.map((x, i) => (
              <button
                key={x.code}
                type="button"
                aria-pressed={i === lang}
                onClick={() => setLang(i)}
                className={`press min-h-11 rounded-full px-4 text-base font-semibold ${
                  i === lang ? "bg-blue-deep text-white" : "bg-surface text-ink ring-1 ring-line hover:ring-ink-soft"
                }`}
              >
                <span lang={x.code}>{x.name}</span>
              </button>
            ))}
          </div>
          <Bubble key={`s-${l.code}`} tone="patient" caption={`Patient · ${l.english}`} lang={l.code} dir={l.dir} className="arrive mt-2">
            {l.said}
          </Bubble>
          <Bubble key={`b-${l.code}`} tone="readback" caption="Read back to the patient" lang={l.code} dir={l.dir} className="arrive">
            {l.readBack}
          </Bubble>
        </div>
      );
    case "deaf":
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-[1.5rem] bg-navy p-5 text-white">
            <p className="flex items-center gap-2 text-sm font-medium text-on-navy-soft">
              <Captions size={18} /> Caption
            </p>
            <p className="mt-1 font-display text-2xl font-semibold leading-snug">Does your chest hurt when you breathe in?</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Yes", "No", "Not sure"].map((a, i) => (
              <span
                key={a}
                className={`flex min-h-12 items-center justify-center gap-1 rounded-full text-base font-semibold ${
                  i === 0 ? "bg-blue-deep text-white" : "bg-surface ring-1 ring-line"
                }`}
              >
                {i === 0 ? <Check size={16} /> : null}
                {a}
              </span>
            ))}
          </div>
          <Bubble tone="patient" caption="Patient typed" className="mt-1">
            It started two days ago.
          </Bubble>
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Keyboard size={18} /> Typing works in any language.
          </p>
        </div>
      );
    case "literacy":
      return (
        <div className="flex flex-col gap-3">
          <p className="font-display text-xl font-bold">Where does it hurt?</p>
          <div className={`mx-auto w-full ${compact ? "max-w-48" : "max-w-64"} rounded-3xl bg-surface p-2 ring-1 ring-line`}>
            <BodyPicture view="front" figure="male" spots={[{ id: "mode-demo", view: "front", x: 104, y: 128, partId: "chest" }]} className="mx-auto h-64 w-32" />
          </div>
          <p className="text-sm font-semibold text-blue-deeper">Chest marked · Next: when did it start?</p>
          <span className="flex min-h-12 items-center gap-2 self-start rounded-full bg-blue-soft px-5 text-base font-semibold text-blue-deeper">
            <Speaker size={20} /> Read aloud
          </span>
        </div>
      );
    case "mute":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {["Pain", "in my chest", "when I breathe", "for two days", "Dizzy", "Nauseous"].map((p, i) => (
              <span
                key={p}
                className={`flex min-h-12 items-center gap-1 rounded-full px-4 text-base font-semibold ${
                  i < 4 ? "bg-blue-deep text-white" : "bg-surface ring-1 ring-line"
                }`}
              >
                {i < 4 ? <Check size={16} /> : null}
                {p}
              </span>
            ))}
          </div>
          <div className="mt-1 rounded-[1.5rem] bg-surface p-4 ring-1 ring-line">
            <p className="text-sm font-medium text-ink-soft">Your selected message</p>
            <p className="mt-0.5 font-display text-xl font-semibold leading-snug">Pain in my chest when I breathe, for 2 days.</p>
            <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-deeper">
              <Speaker size={18} /> Device reads this aloud
            </span>
          </div>
        </div>
      );
  }
}

export function Modes() {
  const { mode: active, setMode: setActive, lang, setLang, eyeChoice, setEyeChoice } = useModesState();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent) {
    const last = modes.length - 1;
    let next = active;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  const m = modes[active];
  const partial = m.id === "literacy";

  return (
    <section id="modes" data-phone-screen="modes" aria-labelledby="modes-title" className="page-mist">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <div className="lg:pr-[26rem]">
        <h2
          id="modes-title"
          className="max-w-[16ch] font-display text-[clamp(2.25rem,6vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]"
        >
          A way to communicate. For every patient.
        </h2>
        <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-ink-soft">
          Choose how the patient communicates. Explore speech, captions, pictures, typed phrases, and the Eye mode board.
        </p>

        <div
          role="tablist"
          aria-label="Patient modes"
          onKeyDown={onKey}
          className="mt-10 flex flex-wrap gap-0.5 rounded-[1.75rem] bg-surface p-1.5 shadow-soft sm:gap-1"
        >
          {modes.map((x, i) => (
            <button type="button"
              key={x.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              id={`tab-${x.id}`}
              aria-selected={i === active}
              aria-controls={`panel-${x.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={`press min-h-12 flex-auto whitespace-nowrap rounded-full px-2 text-sm leading-tight sm:flex-1 sm:px-4 sm:text-base font-semibold ${
                i === active ? "bg-navy text-white" : "text-ink-soft hover:bg-ground-2 hover:text-ink"
              }`}
            >
              <span className="sm:hidden lg:inline" aria-hidden="true">{x.short}</span>
              <span className="sr-only sm:not-sr-only lg:sr-only">{x.tab}{x.short.includes("HoH") ? <span className="sr-only"> (HoH)</span> : null}</span>
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${m.id}`}
          aria-labelledby={`tab-${m.id}`}
          className="mt-6 grid gap-6 lg:mt-10"
        >
          <div key={m.id} className="screen-in rounded-[2.25rem] rounded-bl-[0.5rem] bg-surface p-6 shadow-soft sm:p-8 lg:hidden">
            <span className="inline-block rounded-full bg-blue-soft px-3 py-1 text-sm font-semibold text-blue-deeper">Patient</span>
            <p className="mt-3 max-w-[34rem] text-base leading-relaxed text-ink-soft">{m.intro}</p>
            <div className="mt-6">
              <Panel mode={m.id} lang={lang} setLang={setLang} eyeChoice={eyeChoice} setEyeChoice={setEyeChoice} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
          <p key={m.id} className="screen-in hidden max-w-[34rem] text-xl leading-relaxed text-ink-soft lg:block">{m.intro} On the phone, you see what the patient sees.</p>
          <aside
            aria-label="What the clinician reads"
            className="flex flex-col self-start rounded-[2.25rem] rounded-br-[0.5rem] bg-navy p-6 text-white sm:p-8 lg:w-full lg:max-w-[34rem]"
          >
            <span className="self-start rounded-full bg-navy-raised px-3 py-1 text-sm font-semibold text-white">Clinician · English</span>
            {m.id === "eye" ? (
              <div className="mt-4" aria-live="polite">
                <p className="text-sm text-on-navy-soft">What the patient chose</p>
                <p className="mt-2 font-display text-2xl font-semibold">{eyeChoice ?? "No choice yet"}</p>
                <p className="mt-4 text-base text-on-navy-soft">The confirmed choice appears here for review. This is a simulated conversation; no staff are notified.</p>
              </div>
            ) : <>
            <p className="mt-4 text-sm font-medium text-on-navy-soft">{partial ? "Report so far" : "Chief complaint"}</p>
            <p className="font-display text-2xl font-semibold leading-snug">{partial ? "Chest pain" : summary.chiefComplaint}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-base">
              <div className="rounded-[1.25rem] bg-navy-raised p-4">
                <dt className="text-sm text-on-navy-soft">Duration</dt>
                <dd className="mt-0.5 font-semibold">{partial ? "Not answered yet" : summary.duration}</dd>
              </div>
              <div className="rounded-[1.25rem] bg-navy-raised p-4">
                <dt className="text-sm text-on-navy-soft">Red flag</dt>
                <dd className="mt-0.5 font-semibold text-blue">{summary.redFlag}</dd>
              </div>
            </dl>
            </>}
            <p className="mt-6 text-sm text-on-navy-soft">
              Arrived as: <span className="font-semibold text-white">{m.arrives}</span>
            </p>
          </aside>
          </div>
        </div>
        <p className="mt-6 text-sm text-ink-soft">Synthetic example. Translations are demo phrases.</p>
        </div>
      </div>
    </section>
  );
}
