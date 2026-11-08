"use client";

import { useId, useState, type ReactNode } from "react";
import { PHRASES, QUESTIONS, type Mode, type PatientLanguage, type TranslateInput, type TranslateResponse } from "@/lib/mocks";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cross,
  Handoff,
  Keyboard,
  Mic,
  PictoArm,
  PictoBack,
  PictoBreath,
  PictoCalendar,
  PictoChest,
  PictoClock,
  PictoDizzy,
  PictoEat,
  PictoFever,
  PictoHead,
  PictoLeg,
  PictoMove,
  PictoNausea,
  PictoNone,
  PictoStomach,
  Question,
  Repeat,
  Speaker,
  Stop,
} from "@/components/home/icons";
import { BodyDiagram } from "@/components/input/body-diagram";
import { RegionIdSchema } from "@/lib/contracts";
import { getBodyPart, spotParts, spotsToInputs, type BodyFigure, type BodySpot } from "@/lib/input/body-parts";
import { STRINGS } from "./strings";
import { ActionBar, PrimaryButton, QuietButton, Screen, SpeechBubble, Spinner, Tile, Title } from "./ui";
import { useRecognition, useSpeak } from "./use-speech";

export type LangMeta = { code: PatientLanguage; dir: "ltr" | "rtl"; speech: string; english: string; name: string };

const PICTOS: Record<string, (p: { size?: number }) => ReactNode> = {
  head: PictoHead,
  chest: PictoChest,
  abdomen: PictoStomach,
  back: PictoBack,
  arm: PictoArm,
  leg: PictoLeg,
  clock: PictoClock,
  calendar: PictoCalendar,
  breath: PictoBreath,
  move: PictoMove,
  eat: PictoEat,
  none: PictoNone,
  fever: PictoFever,
  nausea: PictoNausea,
  dizzy: PictoDizzy,
};

function ReadAloud({ text, lang, label }: { text: string; lang: string; label: string }) {
  const { supported, speaking, speak } = useSpeak();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text, lang)}
      className="press inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-blue-soft px-5 text-base font-semibold text-blue-deeper hover:bg-ground-2"
    >
      <Speaker size={20} />
      {label}
      {speaking ? <span className="sr-only"> (playing)</span> : null}
    </button>
  );
}

/* ---------- Free-form intake: speech, typing, or tapped phrases, by mode ---------- */

export function IntakeFree({
  lang,
  mode,
  initialText,
  onSubmit,
}: {
  lang: LangMeta;
  mode: Mode;
  initialText: string;
  onSubmit: (inputs: TranslateInput[]) => void;
}) {
  const t = STRINGS[lang.code];
  const rec = useRecognition(lang.speech);
  const { supported: canSpeak, speak } = useSpeak();
  const [typing, setTyping] = useState(mode === "deaf_hoh" || mode === "mute" || Boolean(initialText));
  const [typed, setTyped] = useState(initialText);
  const [phrases, setPhrases] = useState<string[]>([]);
  const fieldId = useId();

  const micAvailable = rec.supported && !rec.error;
  const effectiveTyping = typing || !micAvailable;
  const showMic = mode !== "mute" && !typing && micAvailable;
  const spoken = [rec.finalText, rec.interim].filter(Boolean).join(" ");
  const composed = phrases.map((id) => PHRASES.find((p) => p.id === id)!.text[lang.code]).join(" ");

  const value = (effectiveTyping ? typed : rec.finalText).trim();
  const full = [composed, value].filter(Boolean).join(". ");

  function submit() {
    rec.stop();
    const inputs: TranslateInput[] = [];
    if (composed) inputs.push({ kind: "text", value: composed });
    if (value) inputs.push({ kind: effectiveTyping ? "text" : "speech_transcript", value });
    onSubmit(inputs);
  }

  return (
    <Screen label="Patient describes the problem" dir={lang.dir} lang={lang.code}>
      <div lang={lang.code} dir={lang.dir} className="flex flex-col gap-3">
        <Title>{t.intakeTitle}</Title>
        <p className="text-lg text-ink-soft">{t.noNames}</p>
      </div>

      {mode === "mute" ? (
        <div lang={lang.code} dir={lang.dir} className="mt-8 flex flex-col gap-4">
          <p className="text-base font-semibold text-blue-deeper">{t.tapPhrases}</p>
          <div className="flex flex-wrap gap-2">
            {PHRASES.map((p) => {
              const on = phrases.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPhrases((cur) => (on ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
                  className={`press inline-flex min-h-14 items-center gap-2 rounded-full px-5 text-lg font-semibold ${
                    on ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:ring-ink-soft"
                  }`}
                >
                  {on ? <Check size={18} /> : null}
                  {p.text[lang.code]}
                </button>
              );
            })}
          </div>
          {composed ? (
            <div className="flex flex-col gap-3">
              <SpeechBubble tone="patient" caption={t.yourMessage} lang={lang.code} dir={lang.dir}>
                {composed}
              </SpeechBubble>
              <div className="flex flex-wrap gap-2">
                {canSpeak ? (
                  <QuietButton icon={<Speaker size={20} />} onClick={() => speak(composed, lang.speech)}>
                    {t.speakForMe}
                  </QuietButton>
                ) : null}
                <QuietButton onClick={() => setPhrases([])}>{t.clearPhrases}</QuietButton>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showMic ? (
        <div lang={lang.code} dir={lang.dir} className="mt-10 flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={rec.listening ? rec.stop : rec.start}
            aria-pressed={rec.listening}
            className={`press grid size-32 place-items-center rounded-full text-white shadow-lift sm:size-36 ${
              rec.listening ? "bg-navy ring-8 ring-blue-soft" : "bg-blue-deep hover:bg-blue-deeper"
            }`}
          >
            {rec.listening ? <Stop size={44} /> : <Mic size={48} />}
            <span className="sr-only">{rec.listening ? t.stop : t.speak}</span>
          </button>
          <p className="text-xl font-semibold text-ink" aria-live="polite">
            {rec.listening ? t.listening : t.speak}
          </p>
          {spoken ? (
            <div className="w-full">
              <SpeechBubble tone="patient" caption={t.yourMessage} lang={lang.code} dir={lang.dir}>
                {spoken}
              </SpeechBubble>
            </div>
          ) : null}
          <QuietButton icon={<Keyboard size={20} />} onClick={() => (rec.stop(), setTyped(rec.finalText), setTyping(true))}>
            {t.typeInstead}
          </QuietButton>
        </div>
      ) : null}

      {typing || (mode !== "mute" && !micAvailable) ? (
        <div lang={lang.code} dir={lang.dir} className="mt-8 flex flex-col gap-3">
          {mode !== "mute" && mode !== "deaf_hoh" && !micAvailable ? <p className="text-base text-ink-soft">{t.micUnavailable}</p> : null}
          <label htmlFor={fieldId} className="text-base font-semibold text-blue-deeper">
            {t.typeHere}
          </label>
          <textarea
            id={fieldId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={4}
            className="field-control resize-y rounded-field p-5 font-display text-[clamp(1.25rem,4vw,1.5rem)] font-semibold leading-snug"
          />
          {mode !== "mute" && micAvailable ? (
            <QuietButton icon={<Mic size={20} />} onClick={() => setTyping(false)} className="self-start">
              {t.speakInstead}
            </QuietButton>
          ) : null}
        </div>
      ) : null}

      <ActionBar>
        <PrimaryButton onClick={submit} disabled={!full} trailing={<ArrowRight size={22} className={lang.dir === "rtl" ? "rotate-180" : ""} />}>
          <span lang={lang.code}>{t.done}</span>
        </PrimaryButton>
      </ActionBar>
    </Screen>
  );
}

/* ---------- Guided intake: one question at a time, pictures, read-aloud ---------- */

export function IntakeGuided({
  lang,
  mode,
  figure,
  onSubmit,
}: {
  lang: LangMeta;
  mode: Mode;
  /** The body drawing the clinician chose. */
  figure?: BodyFigure;
  /** `spots` are the exact places touched on the body diagram, for the clinician's map. */
  onSubmit: (inputs: TranslateInput[], spots?: BodySpot[]) => void;
}) {
  const t = STRINGS[lang.code];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // "Where" can be answered on the body diagram (default for modes that rely on pictures and taps)
  // or with the picture tiles. The diagram takes any number of spots anywhere on the body.
  const [useBody, setUseBody] = useState(mode !== "standard");
  const [spots, setSpots] = useState<BodySpot[]>([]);
  const parts = spotParts(spots);
  const { speak } = useSpeak();
  const q = QUESTIONS[index];
  const last = index === QUESTIONS.length - 1;
  const isWhere = q.id === "where";
  const bodyOn = isWhere && useBody;
  const chosen = bodyOn ? parts.length > 0 : Boolean(answers[q.id]);
  const isScale = q.id === "how_strong";
  const flip = lang.dir === "rtl" ? "rotate-180" : "";

  function changeSpots(next: BodySpot[], added?: BodySpot) {
    setSpots(next);
    // Low-literacy and can't-speak patients hear the part named back (the clinician hears it too).
    const part = added && getBodyPart(added.partId);
    if (part && (mode === "low_literacy" || mode === "mute")) speak(part.text[lang.code], lang.speech);
  }

  function next() {
    if (!last) return setIndex(index + 1);
    onSubmit(
      QUESTIONS.flatMap((x) =>
        x.id === "where" && useBody
          ? spotsToInputs(spots)
          : answers[x.id]
            ? [{ questionId: x.id, kind: "option" as const, value: answers[x.id] }]
            : [],
      ),
      useBody ? spots : undefined,
    );
  }

  return (
    <Screen label="Patient answers questions" dir={lang.dir} lang={lang.code}>
      <div lang={lang.code} dir={lang.dir} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-ink-soft">{t.questionOf(index + 1, QUESTIONS.length)}</span>
          <span className="flex flex-1 gap-1.5" aria-hidden="true">
            {QUESTIONS.map((x, i) => (
              <span key={x.id} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-blue-deep" : "bg-line"}`} />
            ))}
          </span>
        </div>
        <div key={q.id} className="screen-in flex flex-col gap-4">
          <Title>{q.text[lang.code]}</Title>
          {mode !== "deaf_hoh" ? <ReadAloud text={q.text[lang.code]} lang={lang.speech} label={t.readAloud} /> : null}

          {bodyOn ? (
            <div className="mt-2">
              <BodyDiagram regions={RegionIdSchema.options} onSelect={() => {}} lang={lang.code} spots={spots} onSpotsChange={changeSpots} figure={figure} />
            </div>
          ) : isScale ? (
            <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
              {q.options.map((o, i) => {
                const on = answers[q.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={o.label}
                    onClick={() => setAnswers({ ...answers, [q.id]: o.id })}
                    className={`press flex aspect-square min-h-14 flex-col items-center justify-center rounded-full font-display text-[clamp(1.5rem,6vw,2.25rem)] font-bold ${
                      on ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:bg-blue-soft"
                    }`}
                  >
                    {o.text[lang.code]}
                    <span aria-hidden="true" className={`mt-1 block h-1.5 rounded-full ${on ? "bg-white" : "bg-blue"}`} style={{ width: `${(i + 1) * 18}%` }} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {q.options.map((o) => {
                const Picto = o.pictogram ? PICTOS[o.pictogram] : undefined;
                return (
                  <Tile
                    key={o.id}
                    on={answers[q.id] === o.id}
                    onClick={() => setAnswers({ ...answers, [q.id]: o.id })}
                    icon={Picto ? <Picto size={40} /> : undefined}
                  >
                    {o.text[lang.code]}
                  </Tile>
                );
              })}
            </div>
          )}
          {isWhere ? (
            <QuietButton
              icon={useBody ? undefined : <PictoChest size={20} />}
              onClick={() => setUseBody(!useBody)}
              className="self-start"
            >
              {useBody ? t.showList : t.showBody}
            </QuietButton>
          ) : null}
        </div>
      </div>

      <ActionBar>
        {index > 0 ? (
          <QuietButton icon={<ArrowLeft size={20} className={flip} />} onClick={() => setIndex(index - 1)}>
            <span lang={lang.code}>{t.back}</span>
          </QuietButton>
        ) : null}
        <PrimaryButton onClick={next} disabled={!chosen} trailing={<ArrowRight size={22} className={flip} />}>
          <span lang={lang.code}>{last ? t.done : t.next}</span>
        </PrimaryButton>
      </ActionBar>
    </Screen>
  );
}

/* ---------- Patient confirms the read-back before the handoff ---------- */

export function ConfirmReadBack({
  lang,
  mode,
  translation,
  failed,
  fallbackText,
  onYes,
  onRetry,
  onTryAgain,
}: {
  lang: LangMeta;
  mode: Mode;
  translation?: TranslateResponse;
  failed: boolean;
  fallbackText: string;
  onYes: () => void;
  onRetry: () => void;
  onTryAgain: () => void;
}) {
  const t = STRINGS[lang.code];
  const pending = !translation && !failed;
  return (
    <Screen label="Patient checks the read-back" dir={lang.dir} lang={lang.code}>
      <div lang={lang.code} dir={lang.dir} className="flex flex-1 flex-col gap-6">
        {pending ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spinner label={t.working} />
          </div>
        ) : failed ? (
          <>
            <Title>{t.yourMessage}</Title>
            <SpeechBubble tone="patient" caption={lang.name} lang={lang.code} dir={lang.dir} full>
              {fallbackText}
            </SpeechBubble>
            <p role="alert" className="rounded-[1.5rem] bg-ground-2 p-5 text-lg leading-relaxed text-ink">
              {t.couldNotTranslate}
            </p>
          </>
        ) : (
          <>
            <Title>{t.isThisRight}</Title>
            <SpeechBubble tone="readback" caption={t.yourMessage} lang={lang.code} dir={lang.dir} full>
              {translation!.backTranslation}
            </SpeechBubble>
            {mode !== "deaf_hoh" ? <ReadAloud text={translation!.backTranslation} lang={lang.speech} label={t.readAloud} /> : null}
          </>
        )}
      </div>
      {!pending ? (
        <ActionBar>
          {failed ? (
            <QuietButton icon={<Repeat size={20} />} onClick={onRetry}>
              <span lang={lang.code}>{t.retry}</span>
            </QuietButton>
          ) : (
            <QuietButton icon={<Repeat size={20} />} onClick={onTryAgain}>
              <span lang={lang.code}>{t.tryAgain}</span>
            </QuietButton>
          )}
          <PrimaryButton onClick={onYes} icon={<Check size={22} />}>
            <span lang={lang.code}>{t.yesRight}</span>
          </PrimaryButton>
        </ActionBar>
      ) : null}
    </Screen>
  );
}

/* ---------- Patient reads the clinician's reply and confirms understanding ---------- */

export function PatientResponse({
  lang,
  mode,
  text,
  teachBackPrompt,
  inEnglish,
  onAnswer,
}: {
  lang: LangMeta;
  mode: Mode;
  text: string;
  teachBackPrompt: string;
  inEnglish: boolean;
  onAnswer: (a: "yes" | "no" | "unsure") => void;
}) {
  const t = STRINGS[lang.code];
  const shownLang = inEnglish ? "en" : lang.code;
  const shownDir = inEnglish ? "ltr" : lang.dir;
  return (
    <Screen label="Patient reads the clinician's reply" dir={lang.dir} lang={lang.code}>
      <div lang={lang.code} dir={lang.dir} className="flex flex-col gap-5">
        <SpeechBubble tone="clinician" caption={t.clinicianSays} lang={shownLang} dir={shownDir}>
          {text}
        </SpeechBubble>
        {inEnglish ? <p className="text-sm font-semibold text-ink-soft">{t.inEnglish}</p> : null}
        {mode !== "deaf_hoh" ? (
          <ReadAloud text={text} lang={inEnglish ? "en-US" : lang.speech} label={t.listen} />
        ) : null}
        <h2 className="mt-6 font-display text-[clamp(1.5rem,5vw,2rem)] font-bold leading-tight">{teachBackPrompt}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile on={false} onClick={() => onAnswer("yes")} icon={<Check size={36} />}>
            {t.yes}
          </Tile>
          <Tile on={false} onClick={() => onAnswer("no")} icon={<Cross size={36} />}>
            {t.no}
          </Tile>
          <Tile on={false} onClick={() => onAnswer("unsure")} icon={<Question size={36} />}>
            {t.unsure}
          </Tile>
        </div>
      </div>
    </Screen>
  );
}

/* ---------- Patient hands the device back ---------- */

export function HandBack({ lang, onDone }: { lang: LangMeta; onDone: () => void }) {
  const t = STRINGS[lang.code];
  return (
    <section aria-label="Hand the device back" className="screen-in on-navy flex flex-1 flex-col items-center justify-center gap-8 bg-navy px-6 py-16 text-center text-white">
      <span className="pass-to-clinician grid size-24 place-items-center rounded-full bg-navy-raised text-blue [perspective:600px]">
        <Handoff size={44} />
      </span>
      <p lang={lang.code} dir={lang.dir} className="max-w-[18ch] font-display text-[clamp(2rem,7vw,3.25rem)] font-bold leading-[1.05] [text-wrap:balance]">
        {t.handBack}
      </p>
      <button
        type="button"
        onClick={onDone}
        className="press inline-flex min-h-14 items-center gap-2 rounded-full bg-blue px-8 text-lg font-semibold text-navy hover:bg-white"
      >
        <span lang={lang.code}>{t.handBackDone}</span>
      </button>
    </section>
  );
}
