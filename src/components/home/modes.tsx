"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { languages, summary } from "./data";
import { Bubble } from "./phone";
import { useModesState } from "./rail-store";
import {
  Captions,
  Check,
  Keyboard,
  PictoBreath,
  PictoCalendar,
  PictoChest,
  PictoPain,
  Speaker,
} from "./icons";

type ModeId = "language" | "deaf" | "literacy" | "mute";

export const modes: { id: ModeId; tab: string; short: string; arrives: string; intro: string }[] = [
  {
    id: "language",
    tab: "Another language",
    short: "Language",
    arrives: "Speech in the patient’s language",
    intro: "The patient speaks or types in their own language. They hear it read back to confirm it was understood.",
  },
  {
    id: "deaf",
    tab: "Deaf or hard of hearing",
    short: "Deaf/HoH",
    arrives: "Typing and taps, with captions",
    intro: "Every question arrives as large captions. The patient types or taps an answer. No audio-only cues.",
  },
  {
    id: "literacy",
    tab: "Low literacy",
    short: "Literacy",
    arrives: "Pictures, with read-aloud",
    intro: "One question at a time, answered with pictures. Every screen can be read aloud in simple words.",
  },
  {
    id: "mute",
    tab: "Can’t speak",
    short: "Can’t speak",
    arrives: "Tapped phrases, spoken aloud",
    intro: "The patient builds a sentence from tapped phrases, and the device speaks it for them.",
  },
];

function Tile({ on, label, children }: { on?: boolean; label: string; children: ReactNode }) {
  return (
    <span
      className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-[1.75rem] p-3 text-center text-base font-semibold ${
        on ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line"
      }`}
    >
      {children}
      <span className="flex items-center gap-1">
        {on ? <Check size={14} /> : null}
        {label}
      </span>
    </span>
  );
}

export function Panel({
  mode,
  lang,
  setLang,
  compact = false,
}: {
  mode: ModeId;
  lang: number;
  setLang: (n: number) => void;
  /** Inside the phone: narrow layout regardless of the viewport. */
  compact?: boolean;
}) {
  const l = languages[lang];
  switch (mode) {
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
            <p className="mt-1 font-display text-2xl font-semibold leading-snug">Does it hurt more when you breathe in?</p>
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
          <div className={`grid grid-cols-2 gap-2 ${compact ? "" : "sm:grid-cols-4"}`}>
            <Tile on label="Chest">
              <PictoChest size={38} />
            </Tile>
            <Tile on label="Breathing">
              <PictoBreath size={38} />
            </Tile>
            <Tile on label="2 days">
              <PictoCalendar size={38} />
            </Tile>
            <Tile label="Sharp pain">
              <PictoPain size={38} />
            </Tile>
          </div>
          <span className="flex min-h-12 items-center gap-2 self-start rounded-full bg-blue-soft px-5 text-base font-semibold text-blue-deeper">
            <Speaker size={20} /> Read aloud
          </span>
        </div>
      );
    case "mute":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {["Pain", "in my chest", "when I breathe", "for 2 days", "Dizzy", "Can’t sleep"].map((p, i) => (
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
            <p className="text-sm font-medium text-ink-soft">Speaking aloud for the patient</p>
            <p className="mt-0.5 font-display text-xl font-semibold leading-snug">Pain in my chest when I breathe, for 2 days.</p>
            <span className="level mt-3 flex h-6 items-center gap-1" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
                <span key={d} style={{ ["--d" as string]: d }} className="h-full w-1 rounded-full bg-blue-deep" />
              ))}
            </span>
          </div>
        </div>
      );
  }
}

export function Modes() {
  const { mode: active, setMode: setActive, lang, setLang } = useModesState();
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

  return (
    <section id="modes" data-phone-screen="modes" aria-labelledby="modes-title" className="page-mist">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <div className="lg:pr-[26rem]">
        <h2
          id="modes-title"
          className="max-w-[16ch] font-display text-[clamp(2.25rem,6vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]"
        >
          Same symptom. Four ways to say it.
        </h2>
        <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-ink-soft">
          Choose how the patient communicates. However it arrives, the clinician gets the same clear summary.
        </p>

        <div
          role="tablist"
          aria-label="Patient modes"
          onKeyDown={onKey}
          className="mt-10 flex flex-wrap gap-0.5 rounded-[1.75rem] bg-surface p-1.5 shadow-soft sm:flex-nowrap sm:gap-1 sm:rounded-full"
        >
          {modes.map((x, i) => (
            <button
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
              className={`press min-h-12 flex-auto whitespace-nowrap rounded-full px-2 text-sm leading-tight sm:flex-1 sm:px-4 sm:text-base text-base font-semibold ${
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
              <Panel mode={m.id} lang={lang} setLang={setLang} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
          <p key={m.id} className="screen-in hidden max-w-[34rem] text-xl leading-relaxed text-ink-soft lg:block">{m.intro} On the phone, you see what the patient sees.</p>
          <aside
            aria-label="What the clinician reads"
            className="flex flex-col self-start rounded-[2.25rem] rounded-br-[0.5rem] bg-navy p-6 text-white sm:p-8 lg:w-full lg:max-w-[34rem]"
          >
            <span className="self-start rounded-full bg-navy-raised px-3 py-1 text-sm font-semibold text-white">Clinician · English</span>
            <p className="mt-4 text-sm font-medium text-on-navy-soft">Chief complaint</p>
            <p className="font-display text-2xl font-semibold leading-snug">{summary.chiefComplaint}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-base">
              <div className="rounded-[1.25rem] bg-navy-raised p-4">
                <dt className="text-sm text-on-navy-soft">Duration</dt>
                <dd className="mt-0.5 font-semibold">{summary.duration}</dd>
              </div>
              <div className="rounded-[1.25rem] bg-navy-raised p-4">
                <dt className="text-sm text-on-navy-soft">Red flag</dt>
                <dd className="mt-0.5 font-semibold text-blue">{summary.redFlag}</dd>
              </div>
            </dl>
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
