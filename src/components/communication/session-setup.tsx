"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Mic,
  Captions,
  PictoChest,
  Keyboard,
  Handoff,
  Shield,
} from "@/components/home/icons";
import {
  PATIENT_LANGUAGES,
  type Mode,
  type PatientLanguage,
} from "@/lib/mocks";
import { byEnglishName, languageMatches } from "./language-search";
import "./flow.css";

export type SetupMode = Mode | "icu";
export const SETUP_MODES = [
  {
    id: "standard",
    label: "Speak & translate",
    hint: "The patient speaks or types in their language.",
    Icon: Mic,
  },
  {
    id: "deaf_hoh",
    label: "Deaf / hard of hearing",
    hint: "Clear written captions and tap-to-answer questions.",
    Icon: Captions,
  },
  {
    id: "low_literacy",
    label: "Pictures & simple questions",
    hint: "One question at a time, with pictures and read-aloud.",
    Icon: PictoChest,
  },
  {
    id: "mute",
    label: "Can’t speak",
    hint: "Picture choices, typing, and phrases to speak for them.",
    Icon: Keyboard,
  },
  {
    id: "icu",
    label: "Eye selection · ICU",
    hint: "Large communication targets. Interface preview; eye tracking not connected.",
    Icon: Handoff,
  },
] as const;

export function SessionSetup({
  language,
  mode,
  path,
  onLanguage,
  onMode,
  onPath,
  onStart,
  displayControls,
}: {
  language: PatientLanguage;
  mode: SetupMode;
  path: "free" | "guided";
  onLanguage: (value: PatientLanguage) => void;
  onMode: (value: SetupMode) => void;
  onPath: (value: "free" | "guided") => void;
  onStart: () => void;
  displayControls?: ReactNode;
}) {
  return (
    <section className="sf-setup" aria-labelledby="setup-title">
      <div className="sf-heading">
        <h1 id="setup-title">Set up a comfortable conversation.</h1>
        <p>
          Choose what works for this patient. We’ll take care of the screen they
          see.
        </p>
      </div>
      <div className="sf-setup-grid">
        <div>
          <fieldset className="sf-fieldset">
            <legend>Which language does the patient prefer?</legend>
            <LanguageSearch language={language} onLanguage={onLanguage} />
          </fieldset>
          <div className="sf-explainer">
            <Shield size={24} />
            <h2>One device. A clear handoff.</h2>
            <ol>
              <li>You choose the language and support.</li>
              <li>The patient gets a focused screen in their language.</li>
              <li>They pass it back for your summary and reply.</li>
            </ol>
            <p>
              No patient details are stored. Please use synthetic examples for
              this demo.
            </p>
          </div>
        </div>
        <div>
          <fieldset className="sf-fieldset">
            <legend>How will they communicate?</legend>
            <div className="sf-modes">
              {SETUP_MODES.map(({ id, label, hint, Icon }) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={mode === id}
                  onClick={() => onMode(id)}
                >
                  <Icon size={26} />
                  <span>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </span>
                  <span className="sf-check" aria-hidden="true">
                    {mode === id ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          {mode === "icu" ? (
            <p className="sf-preview-note">
              ICU is an English-only interface preview. Eye tracking will be
              connected by the input-channel team.
            </p>
          ) : null}
          {mode !== "icu" ? (
            <fieldset className="sf-fieldset sf-path">
              <legend>Where should the patient start?</legend>
              <div className="sf-path-options">
                <button
                  type="button"
                  aria-pressed={path === "free"}
                  onClick={() => onPath("free")}
                >
                  {mode === "mute" || mode === "deaf_hoh"
                    ? "Type or use phrases"
                    : "Speak or type freely"}
                </button>
                <button
                  type="button"
                  aria-pressed={path === "guided"}
                  onClick={() => onPath("guided")}
                >
                  Guided picture questions
                </button>
              </div>
            </fieldset>
          ) : null}
        </div>
      </div>
      {displayControls ? (
        <details className="sf-display">
          <summary>Display and read-aloud options</summary>
          {displayControls}
        </details>
      ) : null}
      <div className="sf-setup-action">
        <p>
          {PATIENT_LANGUAGES.find((l) => l.code === language)?.english} ·{" "}
          {SETUP_MODES.find((m) => m.id === mode)?.label}
        </p>
        <button type="button" className="sf-primary" onClick={onStart}>
          <Handoff size={22} /> Pass to patient
        </button>
      </div>
    </section>
  );
}

/** Search box plus the matching languages. The chosen one stays visible while searching. */
function LanguageSearch({
  language,
  onLanguage,
}: {
  language: PatientLanguage;
  onLanguage: (value: PatientLanguage) => void;
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const sorted = [...PATIENT_LANGUAGES].sort(byEnglishName);
  const results = sorted.filter((l) => languageMatches(l, query));
  const shown = sorted.filter((l) => l.code === language || languageMatches(l, query));

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    // Typing a name and pressing Enter picks the first match.
    if (e.key === "Enter" && results[0]) {
      e.preventDefault();
      onLanguage(results[0].code);
    }
    if (e.key === "Escape") setQuery("");
  }

  return (
    <>
      <div className="sf-language-search">
        <label htmlFor={searchId} className="sr-only">
          Search languages
        </label>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search languages"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${searchId}-count`}
        />
      </div>
      <p id={`${searchId}-count`} aria-live="polite" className="sr-only">
        {query.trim()
          ? `${results.length} ${results.length === 1 ? "language" : "languages"} found`
          : `${PATIENT_LANGUAGES.length} languages`}
      </p>
      <div className="sf-languages">
        {shown.map((l) => (
          <button
            type="button"
            key={l.code}
            aria-pressed={language === l.code}
            onClick={() => onLanguage(l.code)}
          >
            <span lang={l.code} dir={l.dir}>
              {l.name}
            </span>
            <small>{l.english}</small>
            {language === l.code ? <span aria-hidden="true">✓</span> : null}
          </button>
        ))}
        {results.length === 0 ? (
          <p className="sf-language-empty">
            No language matches &ldquo;{query.trim()}&rdquo;. Try its English name or language code.
          </p>
        ) : null}
      </div>
    </>
  );
}
