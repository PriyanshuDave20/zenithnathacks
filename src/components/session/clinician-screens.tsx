"use client";

import { addQuickReply, useQuickReplies } from "@/lib/quick-replies";
import { HomeLink } from "@/components/auth/home-link";

import { useId, useState } from "react";
import {
  CLINICIAN_REPLIES,
  PATIENT_LANGUAGES,
  QUESTIONS,
  mockCanTranslateReply,
  type Mode,
  type PatientLanguage,
  type RespondResponse,
  type TranslateInput,
  type TranslateResponse,
} from "@/lib/mocks";
import { Alert, ArrowLeft, Captions, Check, Clear, Handoff, Keyboard, Mic, PictoChest, Send, Shield } from "@/components/home/icons";
import type { LangMeta } from "./patient-screens";
import { ActionBar, ChoicePill, PrimaryButton, QuietButton, Screen, Spinner, Title } from "./ui";

export type Path = "free" | "guided";

export type Exchange = {
  reply: string;
  response: RespondResponse;
  inEnglish: boolean;
  teachBack?: "yes" | "no" | "unsure";
};

const MODES: { id: Mode; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "standard", label: "Speaks", hint: "Voice or typing in their language", icon: <Mic size={20} /> },
  {
    id: "deaf_hoh",
    label: "Deaf or hard of hearing",
    hint: "Typing and taps, large captions, no audio cues",
    icon: <Captions size={20} />,
  },
  { id: "low_literacy", label: "Prefers pictures", hint: "One question at a time, pictures, read aloud", icon: <PictoChest size={20} /> },
  { id: "mute", label: "Can’t speak", hint: "Tapped phrases spoken aloud, or typing", icon: <Keyboard size={20} /> },
  {
    id: "icu",
    label: "ICU (eye-gaze)",
    hint: "Cannot move or speak - looks at options, camera tracks the gaze",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.75" />
      </svg>
    ),
  },
];

export const MODE_LABEL: Record<Mode, string> = {
  standard: "Speaks",
  deaf_hoh: "Deaf or hard of hearing",
  low_literacy: "Prefers pictures",
  mute: "Can’t speak",
  icu: "ICU (eye-gaze)",
};

export const defaultPath = (mode: Mode): Path => (mode === "low_literacy" || mode === "icu" ? "guided" : "free");

export const freeLabel = (mode: Mode) => (mode === "deaf_hoh" ? "Type freely" : mode === "mute" ? "Tap phrases or type" : "Speak freely");

function SectionLabel({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 text-base font-semibold text-ink-soft">
      {children}
    </h2>
  );
}

/* ---------- Start: two taps, then pass ---------- */

export function StartScreen({ onStart }: { onStart: (s: { language: PatientLanguage; mode: Mode; path: Path }) => void }) {
  const [language, setLanguage] = useState<PatientLanguage | null>(null);
  const [mode, setMode] = useState<Mode>("standard");
  const [path, setPath] = useState<Path>("free");
  const [pathTouched, setPathTouched] = useState(false);
  const ids = { lang: useId(), mode: useId(), path: useId() };

  function pickMode(m: Mode) {
    setMode(m);
    if (!pathTouched) setPath(defaultPath(m));
  }

  return (
    <Screen label="New session" wide>
      <div>
        <Title>New patient</Title>
        <p className="mt-3 max-w-[36rem] text-lg leading-relaxed text-ink-soft">
          Pick the patient&rsquo;s language and how they communicate, then pass them the device.
        </p>
      </div>

      {/* Phones: language, mode, path, privacy. Desktop: language + privacy | mode + path. Path always follows mode. */}
      <div className="mt-8 flex flex-col gap-9 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10">
        <div className="contents lg:flex lg:flex-col lg:gap-9">
          <div role="group" aria-labelledby={ids.lang} className="order-1 lg:order-none">
            <SectionLabel id={ids.lang}>Patient&rsquo;s language</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {PATIENT_LANGUAGES.map((l) => (
                <ChoicePill key={l.code} on={language === l.code} onClick={() => setLanguage(l.code)}>
                  <span lang={l.code} className="block leading-tight">
                    {l.name}
                  </span>
                  {l.english !== l.name ? (
                    <span className={`block text-sm font-medium ${language === l.code ? "text-white/85" : "text-ink-soft"}`}>
                      {l.english}
                    </span>
                  ) : null}
                </ChoicePill>
              ))}
            </div>
          </div>
          <p className="order-4 flex items-start gap-3 rounded-[1.5rem] bg-ground-2 p-5 text-base leading-relaxed text-ink-soft">
            <Shield size={22} className="mt-0.5 shrink-0 text-blue-deep" />
            Nothing is stored. Ask the patient not to share names or personal details. Synapse is a communication aid, not a diagnostic tool
            or certified interpreter.
          </p>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-9">
          <div role="group" aria-labelledby={ids.mode} className="order-2 lg:order-none">
            <SectionLabel id={ids.mode}>How they communicate</SectionLabel>
            <div className="grid gap-3">
              {MODES.map((m) => (
                <ChoicePill key={m.id} on={mode === m.id} onClick={() => pickMode(m.id)} icon={m.icon} className="rounded-[1.5rem] py-3">
                  <span className="block leading-tight">{m.label}</span>
                  <span className={`block text-sm font-medium ${mode === m.id ? "text-white/85" : "text-ink-soft"}`}>{m.hint}</span>
                </ChoicePill>
              ))}
            </div>
          </div>
          <div role="group" aria-labelledby={ids.path} className="order-3 lg:order-none">
            <SectionLabel id={ids.path}>How they&rsquo;ll answer</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ChoicePill on={path === "free"} onClick={() => (setPath("free"), setPathTouched(true))}>
                {freeLabel(mode)}
              </ChoicePill>
              <ChoicePill on={path === "guided"} onClick={() => (setPath("guided"), setPathTouched(true))}>
                Answer questions
              </ChoicePill>
            </div>
          </div>
        </div>
      </div>

      <ActionBar>
        <PrimaryButton disabled={!language} onClick={() => language && onStart({ language, mode, path })} icon={<Handoff size={22} />}>
          {language ? "Pass to patient" : "Pick a language first"}
        </PrimaryButton>
      </ActionBar>
    </Screen>
  );
}

/* ---------- Handoff: a full-screen turn that hides the previous person's content ---------- */

export function HandoffScreen({
  to,
  lang,
  patientLine,
  buttonLabel,
  onContinue,
}: {
  to: "Clinician" | "Patient";
  lang: LangMeta;
  patientLine?: string;
  buttonLabel: string;
  onContinue: () => void;
}) {
  return (
    <section
      aria-label={`Pass the device to the ${to.toLowerCase()}`}
      className="screen-in on-navy flex flex-1 flex-col items-center justify-center gap-7 bg-navy px-6 py-16 text-center text-white"
    >
      <span
        className={`grid size-24 place-items-center rounded-full bg-navy-raised text-blue [perspective:600px] ${to === "Patient" ? "pass-to-patient" : "pass-to-clinician"}`}
      >
        <Handoff size={44} className={to === "Patient" ? "-scale-x-100" : ""} />
      </span>
      {to === "Clinician" && patientLine ? (
        <>
          <p
            lang={lang.code}
            dir={lang.dir}
            className="max-w-[18ch] font-display text-[clamp(2rem,7vw,3.25rem)] font-bold leading-[1.05] [text-wrap:balance]"
          >
            {patientLine}
          </p>
          <p className="text-lg text-on-navy-soft">Pass the device to the clinician</p>
        </>
      ) : (
        <>
          <p className="max-w-[18ch] font-display text-[clamp(2rem,7vw,3.25rem)] font-bold leading-[1.05] [text-wrap:balance]">
            Pass the device to the patient
          </p>
          <p className="text-lg text-on-navy-soft">Your reply is ready in {lang.english}.</p>
        </>
      )}
      <p className="max-w-[30rem] text-base text-on-navy-soft">
        {to === "Clinician"
          ? "The patient’s screen is hidden until the clinician continues."
          : "The summary is hidden while the patient holds the device."}
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="press mt-2 inline-flex min-h-14 items-center gap-2 rounded-full bg-blue px-8 text-lg font-semibold text-navy hover:bg-white"
      >
        {buttonLabel}
      </button>
    </section>
  );
}

/* ---------- Review: structured summary beside the original and the back-translation ---------- */

export function ReviewScreen({
  lang,
  mode,
  path,
  inputs,
  translation,
  failed,
  exchanges,
  onReply,
  onEnd,
}: {
  lang: LangMeta;
  mode: Mode;
  path: Path;
  inputs: TranslateInput[];
  translation?: TranslateResponse;
  failed: boolean;
  exchanges: Exchange[];
  onReply: () => void;
  onEnd: () => void;
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const guidedLabels = inputs
    .filter((i) => i.questionId)
    .map((i) => QUESTIONS.find((q) => q.id === i.questionId)?.options.find((o) => o.id === i.value)?.label)
    .filter(Boolean) as string[];
  const original =
    translation?.original ??
    inputs
      .filter((i) => !i.questionId)
      .map((i) => i.value)
      .join(" ");
  const s = translation?.summary;

  return (
    <Screen label="Clinician review" wide>
      <Title>What the patient said</Title>
      <p className="mt-3 text-base text-ink-soft">
        {lang.english} · {MODE_LABEL[mode]} · {path === "guided" ? "Answered questions" : freeLabel(mode)}
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {failed ? (
          <section aria-label="Translation unavailable" className="rounded-[2rem] bg-navy p-6 text-white sm:p-8">
            <p className="flex items-center gap-2 text-lg font-semibold text-blue">
              <Alert size={22} /> Translation unavailable
            </p>
            <p className="mt-3 text-base leading-relaxed text-on-navy-soft">
              Showing the patient&rsquo;s own words. Ask for a staff or phone interpreter if you need more.
            </p>
            {guidedLabels.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {guidedLabels.map((g) => (
                  <li key={g} className="rounded-full bg-navy-raised px-4 py-2 text-base font-semibold">
                    {g}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : s ? (
          <section aria-label="Structured summary" className="rounded-[2rem] rounded-br-[0.5rem] bg-navy p-6 text-white sm:p-8">
            <p className="text-sm font-medium text-on-navy-soft">Chief complaint</p>
            <p className="mt-1 font-display text-[clamp(1.75rem,4.5vw,2.25rem)] font-bold leading-tight">{s.chiefComplaint}</p>

            {s.redFlags.length ? (
              <div className="mt-6 rounded-[1.25rem] bg-blue p-4 text-navy">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Alert size={18} /> Red flag{s.redFlags.length > 1 ? "s" : ""}: assess first
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {s.redFlags.map((f) => (
                    <li key={f} className="rounded-full bg-navy px-4 py-1.5 text-base font-semibold text-white">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-navy-raised p-4">
                <dt className="text-sm text-on-navy-soft">Duration</dt>
                <dd className="mt-0.5 text-lg font-semibold">{s.duration ?? "Not stated"}</dd>
              </div>
              <div className="rounded-[1.25rem] bg-navy-raised p-4">
                <dt className="text-sm text-on-navy-soft">Symptoms</dt>
                <dd className="mt-0.5 text-lg font-semibold">{s.symptoms.length ? s.symptoms.join(", ") : "None stated"}</dd>
              </div>
            </dl>

            <p className="mt-6 text-sm font-medium text-on-navy-soft">In English</p>
            <p className="mt-1 text-lg leading-relaxed">{translation!.translated}</p>

            {translation!.lowConfidence.length ? (
              <div className="mt-6 rounded-[1.25rem] bg-navy-raised p-4">
                <p className="flex items-center gap-2 text-base font-semibold text-blue">
                  <Alert size={18} /> Check with the patient
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-base text-on-navy-soft">
                  {translation!.lowConfidence.map((l) => (
                    <li key={l.phrase} className="flex flex-col gap-0.5">
                      <span lang={lang.code} dir={lang.dir} className="font-semibold text-white">
                        {l.phrase}
                      </span>
                      <span>{l.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {translation!.redactions ? (
              <p className="mt-4 text-sm text-on-navy-soft">
                {translation!.redactions} personal detail{translation!.redactions > 1 ? "s were" : " was"} removed before translation.
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="rounded-[1.75rem] bg-ground-2 p-5 sm:p-6">
            <p className="text-sm font-medium text-ink-soft">Patient&rsquo;s words · {lang.english}</p>
            <p lang={lang.code} dir={lang.dir} className="mt-1 whitespace-pre-line font-display text-xl font-semibold leading-snug">
              {original || "No words given"}
            </p>
            {!failed && translation && translation.backTranslation === original ? (
              <p className="mt-3 flex items-center gap-1.5 text-base font-semibold text-blue-deeper">
                <Check size={18} /> Read back to the patient and confirmed
              </p>
            ) : null}
          </div>
          {!failed && translation && translation.backTranslation !== original ? (
            <div className="rounded-[1.75rem] p-5 ring-1 ring-line sm:p-6">
              <p className="text-sm font-medium text-ink-soft">Back-translation the patient checked</p>
              <p lang={lang.code} dir={lang.dir} className="mt-1 whitespace-pre-line font-display text-xl font-semibold leading-snug">
                {translation.backTranslation}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-base font-semibold text-blue-deeper">
                <Check size={18} /> Patient confirmed
              </p>
            </div>
          ) : null}

          {exchanges.length ? (
            <section aria-label="Replies so far" className="rounded-[1.75rem] p-5 ring-1 ring-line sm:p-6">
              <h2 className="text-sm font-medium text-ink-soft">Your replies</h2>
              <ol className="mt-3 flex flex-col gap-4">
                {exchanges.map((e, i) => (
                  <li key={i} className="flex flex-col gap-1.5">
                    <p className="text-base font-semibold leading-snug">{e.reply}</p>
                    <p
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                        e.teachBack === "yes" ? "bg-blue-soft text-blue-deeper" : "bg-ground-2 text-ink"
                      }`}
                    >
                      {e.teachBack === "yes" ? <Check size={14} /> : <Alert size={14} />}
                      Understood: {e.teachBack === "yes" ? "Yes" : e.teachBack === "no" ? "No" : "Not sure"}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>

      <ActionBar>
        {confirmEnd ? (
          <div role="group" aria-label="Confirm end session" className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <p className="text-base font-semibold text-ink">End and clear this session?</p>
            <QuietButton onClick={() => setConfirmEnd(false)}>Keep going</QuietButton>
            <QuietButton icon={<Clear size={20} />} onClick={onEnd} className="text-ink ring-ink-soft">
              End and clear
            </QuietButton>
          </div>
        ) : (
          <>
            <QuietButton icon={<Clear size={20} />} onClick={() => setConfirmEnd(true)}>
              End session
            </QuietButton>
            <PrimaryButton icon={<Send size={22} />} onClick={onReply}>
              {exchanges.length ? "Reply or ask a follow-up" : "Reply to patient"}
            </PrimaryButton>
          </>
        )}
      </ActionBar>
    </Screen>
  );
}

/* ---------- Reply: quick replies or free text, simplified for the patient ---------- */

export function ReplyScreen({
  lang,
  sending,
  error,
  onSend,
  onSendInEnglish,
  onBack,
}: {
  lang: LangMeta;
  sending: boolean;
  error: boolean;
  onSend: (message: string) => void;
  onSendInEnglish: (message: string) => void;
  onBack: () => void;
}) {
  const [message, setMessage] = useState("");
  const fieldId = useId();
  const trimmed = message.trim();
  const saved = useQuickReplies();
  const canSave = !!trimmed && !saved.includes(trimmed) && !CLINICIAN_REPLIES.some((r) => r.en === trimmed);
  const demoNotice = trimmed && !mockCanTranslateReply(trimmed, lang.code);

  return (
    <Screen label="Clinician reply" wide>
      <div>
        <Title>Reply to the patient</Title>
        <p className="mt-3 max-w-[38rem] text-lg leading-relaxed text-ink-soft">
          Short, plain sentences work best. Synapse simplifies it into {lang.english} and asks the patient if they understood.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          {saved.length ? (
            <>
              <h2 className="mb-3 text-base font-semibold text-ink-soft">Your saved replies</h2>
              <div className="mb-6 flex flex-col gap-2">
                {saved.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={message === r}
                    onClick={() => setMessage(r)}
                    className={`press min-h-14 rounded-[1.5rem] px-5 py-3 text-left text-base font-semibold leading-snug ${
                      message === r ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:ring-ink-soft"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <h2 className="mb-3 text-base font-semibold text-ink-soft">Suggested replies</h2>
          <div className="flex flex-col gap-2">
            {CLINICIAN_REPLIES.map((r) => (
              <button
                key={r.en}
                type="button"
                aria-pressed={message === r.en}
                onClick={() => setMessage(r.en)}
                className={`press min-h-14 rounded-[1.5rem] px-5 py-3 text-left text-base font-semibold leading-snug ${
                  message === r.en ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:ring-ink-soft"
                }`}
              >
                {r.en}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <label htmlFor={fieldId} className="text-base font-semibold text-ink-soft">
            Your reply
          </label>
          <textarea
            id={fieldId}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="field-control resize-y rounded-field p-5 text-lg leading-relaxed"
          />
          {canSave ? (
            <QuietButton onClick={() => addQuickReply(trimmed)} className="self-start">
              Save as quick reply
            </QuietButton>
          ) : null}
          {demoNotice ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Demo: only the suggested replies have translations right now. Other replies reach the patient in English until the translation
              service is connected.
            </p>
          ) : null}
          {error ? (
            <div role="alert" className="flex flex-col gap-3 rounded-[1.5rem] bg-ground-2 p-5">
              <p className="flex items-center gap-2 text-base font-semibold text-ink">
                <Alert size={20} className="text-blue-deep" /> Couldn&rsquo;t translate your reply.
              </p>
              <p className="text-base text-ink-soft">Send it in English, or try again.</p>
              <QuietButton onClick={() => onSendInEnglish(trimmed)} className="self-start">
                Send in English
              </QuietButton>
            </div>
          ) : null}
        </div>
      </div>

      <ActionBar>
        <QuietButton icon={<ArrowLeft size={20} />} onClick={onBack} disabled={sending}>
          Back to summary
        </QuietButton>
        <PrimaryButton disabled={!trimmed || sending} onClick={() => onSend(trimmed)} icon={sending ? undefined : <Handoff size={22} />}>
          {sending ? <Spinner label="Preparing" /> : error ? "Try again" : "Pass to patient"}
        </PrimaryButton>
      </ActionBar>
    </Screen>
  );
}

/* ---------- End ---------- */

export function EndScreen({ onNew }: { onNew: () => void }) {
  return (
    <Screen label="Session ended">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
        <span className="grid size-24 place-items-center rounded-full bg-blue-soft text-blue-deep">
          <Clear size={44} />
        </span>
        <Title>Session cleared</Title>
        <p className="max-w-[30rem] text-lg leading-relaxed text-ink-soft">
          The summary, the patient&rsquo;s words, and every answer have been removed from this device.
        </p>
      </div>
      <ActionBar>
        <HomeLink
          className="press inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-base font-semibold text-blue-deeper ring-1 ring-line hover:bg-blue-soft sm:w-auto"
        >
          Back to home
        </HomeLink>
        <PrimaryButton onClick={onNew}>New patient</PrimaryButton>
      </ActionBar>
    </Screen>
  );
}
