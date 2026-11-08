"use client";

import { HomeLink } from "@/components/auth/home-link";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { AccountLink } from "@/components/auth/account-link";
import { SynapseMark } from "@/components/brand/synapse-logo";
import { Clear } from "@/components/home/icons";
import {
  PATIENT_LANGUAGES,
  mockCanTranslateReply,
  type Mode,
  type PatientLanguage,
  type TranslateInput,
  type TranslateResponse,
} from "@/lib/mocks";
import { respond, translate } from "./api";
import { SessionMetrics } from "./metrics-lifecycle";
import { requestGaze } from "@/lib/input/gaze/gaze-request";
import {
  EndScreen,
  HandoffScreen,
  ReplyScreen,
  ReviewScreen,
  StartScreen,
  type Exchange,
  type Path,
} from "./clinician-screens";
import { ConfirmReadBack, HandBack, IntakeFree, IntakeGuided, PatientResponse, type LangMeta } from "./patient-screens";
import { STRINGS } from "./strings";
import { HolderPill, type Holder } from "./ui";
import { useIdle } from "./use-idle";

type Stage =
  | "start"
  | "intake"
  | "confirm"
  | "to-clinician"
  | "review"
  | "reply"
  | "to-patient"
  | "response"
  | "hand-back"
  | "end";

type State = {
  stage: Stage;
  language: PatientLanguage;
  mode: Mode;
  path: Path;
  inputs: TranslateInput[];
  translation?: TranslateResponse;
  translateFailed: boolean;
  exchanges: Exchange[];
  sending: boolean;
  replyError: boolean;
  startedAt: number;
  firstMessageSent: boolean;
};

// Everything about the visit lives here, in memory. Nothing is written to storage or sent anywhere but the API.
const EMPTY: State = {
  stage: "start",
  language: "es",
  mode: "standard",
  path: "free",
  inputs: [],
  translateFailed: false,
  exchanges: [],
  sending: false,
  replyError: false,
  startedAt: 0,
  firstMessageSent: false,
};

type Action =
  | { type: "start"; language: PatientLanguage; mode: Mode; path: Path; at: number }
  | { type: "submit"; inputs: TranslateInput[] }
  | { type: "translated"; translation: TranslateResponse }
  | { type: "translate-failed" }
  | { type: "retry-translate" }
  | { type: "go"; stage: Stage }
  | { type: "first-message" }
  | { type: "sending" }
  | { type: "reply-failed" }
  | { type: "replied"; exchange: Exchange }
  | { type: "teach-back"; answer: "yes" | "no" | "unsure" }
  | { type: "clear" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "start":
      return { ...EMPTY, stage: "intake", language: a.language, mode: a.mode, path: a.path, startedAt: a.at };
    case "submit":
      return { ...s, stage: "confirm", inputs: a.inputs, translation: undefined, translateFailed: false };
    case "translated":
      return { ...s, translation: a.translation, translateFailed: false };
    case "translate-failed":
      return { ...s, translateFailed: true };
    case "retry-translate":
      return { ...s, translateFailed: false, translation: undefined };
    case "go":
      return { ...s, stage: a.stage, replyError: a.stage === "reply" ? false : s.replyError };
    case "first-message":
      return { ...s, firstMessageSent: true };
    case "sending":
      return { ...s, sending: true, replyError: false };
    case "reply-failed":
      return { ...s, sending: false, replyError: true };
    case "replied":
      return { ...s, sending: false, replyError: false, exchanges: [...s.exchanges, a.exchange], stage: "to-patient" };
    case "teach-back": {
      const exchanges = s.exchanges.slice();
      exchanges[exchanges.length - 1] = { ...exchanges[exchanges.length - 1], teachBack: a.answer };
      return { ...s, exchanges, stage: "hand-back" };
    }
    case "clear":
      return EMPTY;
  }
}

const HOLDER: Record<Stage, Holder> = {
  start: "Clinician",
  intake: "Patient",
  confirm: "Patient",
  "to-clinician": "Patient",
  review: "Clinician",
  reply: "Clinician",
  "to-patient": "Clinician",
  response: "Patient",
  "hand-back": "Patient",
  end: "Clinician",
};

const IDLE_MS = 3 * 60 * 1000;
const GRACE_MS = 30 * 1000;

export function SessionApp() {
  const [s, dispatch] = useReducer(reducer, EMPTY);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const metrics = useRef(new SessionMetrics());
  const meta = PATIENT_LANGUAGES.find((l) => l.code === s.language)!;
  const lang: LangMeta = { code: meta.code, dir: meta.dir, speech: meta.speech, english: meta.english, name: meta.name };
  const inSession = s.stage !== "start" && s.stage !== "end";

  // Privacy: never let a visit survive leaving the page. With cacheComponents, Next keeps routes hidden
  // (React Activity) instead of unmounting them, so wipe in the effect cleanup that runs on hide, and on
  // pagehide / bfcache restore for full-page navigations.
  useEffect(() => {
    const wipe = () => {
      metrics.current.reset();
      window.speechSynthesis?.cancel();
      dispatch({ type: "clear" });
    };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) wipe();
    };
    window.addEventListener("pagehide", wipe);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pagehide", wipe);
      window.removeEventListener("pageshow", onShow);
      wipe();
    };
  }, []);

  // Move focus to each new screen so keyboard and screen-reader users land at the top of the new turn.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [s.stage]);

  // Eye tracking runs only in the ICU (eye-gaze) mode, and only once the visit is under way - the
  // intake screen carries the patient's options, which the calibration sweep covers. Any other
  // mode, the start/end screens, a cleared or idle-expired session withdraws the request, which
  // stops tracking and releases the camera. The cleanup also covers leaving the page entirely.
  useEffect(() => {
    const gazeOn = s.mode === "icu" && s.stage !== "start" && s.stage !== "end";
    requestGaze(gazeOn);
    return () => requestGaze(false);
  }, [s.mode, s.stage]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const clear = useCallback((reason: string) => {
    metrics.current.reset();
    window.speechSynthesis?.cancel();
    dispatch({ type: "clear" });
    setConfirmClear(false);
    setToast(reason);
  }, []);

  const { warningLeft, keepAlive } = useIdle({
    enabled: inSession,
    idleMs: IDLE_MS,
    graceMs: GRACE_MS,
    onExpire: () => clear("Session cleared after inactivity"),
  });

  // Translation runs whenever the patient's inputs are submitted (or retried) and no result is held yet.
  const translating = s.stage === "confirm" && !s.translation && !s.translateFailed;
  useEffect(() => {
    if (!translating) return;
    let live = true;
    translate({ context: { language: s.language, mode: s.mode, readingLevel: s.mode === "low_literacy" ? 2 : 3 }, inputs: s.inputs })
      .then((translation) => live && dispatch({ type: "translated", translation }))
      .catch(() => live && dispatch({ type: "translate-failed" }));
    return () => {
      live = false;
    };
  }, [translating, s.inputs, s.language, s.mode]);

  async function sendReply(message: string, forceEnglish = false) {
    const context = { language: s.language, mode: s.mode, readingLevel: (s.mode === "low_literacy" ? 2 : 3) as 2 | 3 };
    if (forceEnglish) {
      dispatch({
        type: "replied",
        exchange: { reply: message, inEnglish: s.language !== "en", response: { patientText: message, readAloudText: message, teachBackPrompt: STRINGS[s.language].isThisRight } },
      });
      return;
    }
    dispatch({ type: "sending" });
    try {
      const response = await respond({ context, message });
      const inEnglish = s.language !== "en" && !mockCanTranslateReply(message, s.language);
      dispatch({ type: "replied", exchange: { reply: message, response, inEnglish } });
    } catch {
      dispatch({ type: "reply-failed" });
    }
  }

  const patientHolds = HOLDER[s.stage] === "Patient";
  const idleLang = patientHolds ? s.language : "en";
  const idleDir = patientHolds ? lang.dir : "ltr";
  const idleText = STRINGS[patientHolds ? s.language : "en"];

  const fallbackText = s.inputs.map((i) => i.value).join(" · ");
  const holder = HOLDER[s.stage];
  const handoff = s.stage === "to-clinician" || s.stage === "to-patient" || s.stage === "hand-back";

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="on-navy sticky top-0 z-30 border-b border-white/10 bg-navy/92 pt-[env(safe-area-inset-top)] text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <HomeLink className="rounded-lg" aria-label="Synapse home">
            <SynapseMark className="h-9 w-auto" />
          </HomeLink>
          <span className="hidden font-display text-lg font-bold min-[380px]:inline">Session</span>
          <span aria-live="polite" className="inline-flex">
            <span className="sr-only">Now holding the device: </span>
            <HolderPill holder={holder} onNavy />
          </span>
          <span className="ms-auto flex items-center gap-2">
            {!confirmClear && !inSession ? <AccountLink /> : null}
            {confirmClear ? (
              <span role="group" aria-label="Confirm clear" className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="press min-h-11 rounded-full px-4 text-base font-semibold text-on-navy-soft hover:bg-navy-raised hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => clear("Session cleared")}
                  className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-blue px-4 text-base font-semibold text-navy hover:bg-white"
                >
                  <Clear size={18} /> Clear now
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => (inSession ? setConfirmClear(true) : clear("Nothing to clear"))}
                className="press inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-semibold text-blue ring-1 ring-blue/60 hover:bg-navy-raised hover:text-white"
              >
                <Clear size={18} /> Clear
              </button>
            )}
          </span>
        </div>
      </header>

      <div
        ref={mainRef}
        tabIndex={-1}
        className={`flex flex-1 flex-col outline-none ${handoff ? "bg-navy" : ""}`}
        aria-live="off"
      >
        <div key={s.stage + s.exchanges.length} className="flex flex-1 flex-col">
          {s.stage === "start" ? (
            <StartScreen
              onStart={({ language, mode, path }) => {
                dispatch({ type: "start", language, mode, path, at: Date.now() });
                metrics.current.start(mode);
              }}
            />
          ) : null}

          {s.stage === "intake" && s.path === "free" ? (
            <IntakeFree
              lang={lang}
              mode={s.mode}
              initialText={s.inputs.filter((i) => i.kind === "text" || i.kind === "speech_transcript").map((i) => i.value).join(" ")}
              onSubmit={(inputs) => dispatch({ type: "submit", inputs })}
            />
          ) : null}
          {s.stage === "intake" && s.path === "guided" ? (
            <IntakeGuided lang={lang} mode={s.mode} onSubmit={(inputs) => dispatch({ type: "submit", inputs })} />
          ) : null}

          {s.stage === "confirm" ? (
            <ConfirmReadBack
              lang={lang}
              mode={s.mode}
              translation={s.translation}
              failed={s.translateFailed}
              fallbackText={fallbackText}
              onYes={() => {
                metrics.current.firstMessage();
                dispatch({ type: "go", stage: "to-clinician" });
              }}
              onRetry={() => dispatch({ type: "retry-translate" })}
              onTryAgain={() => dispatch({ type: "go", stage: "intake" })}
            />
          ) : null}

          {s.stage === "to-clinician" ? (
            <HandoffScreen
              to="Clinician"
              lang={lang}
              patientLine={STRINGS[s.language].passToClinician}
              buttonLabel="I’m the clinician"
              onContinue={() => {
                if (!s.firstMessageSent) {
                  dispatch({ type: "first-message" });
                }
                dispatch({ type: "go", stage: "review" });
              }}
            />
          ) : null}

          {s.stage === "review" ? (
            <ReviewScreen
              lang={lang}
              mode={s.mode}
              path={s.path}
              inputs={s.inputs}
              translation={s.translation}
              failed={s.translateFailed}
              exchanges={s.exchanges}
              onReply={() => dispatch({ type: "go", stage: "reply" })}
              onEnd={() => {
                metrics.current.reset();
                window.speechSynthesis?.cancel();
                dispatch({ type: "clear" });
                dispatch({ type: "go", stage: "end" });
              }}
            />
          ) : null}

          {s.stage === "reply" ? (
            <ReplyScreen
              lang={lang}
              sending={s.sending}
              error={s.replyError}
              onSend={(m) => sendReply(m)}
              onSendInEnglish={(m) => sendReply(m, true)}
              onBack={() => dispatch({ type: "go", stage: "review" })}
            />
          ) : null}

          {s.stage === "to-patient" ? (
            <HandoffScreen to="Patient" lang={lang} buttonLabel="Show the patient" onContinue={() => dispatch({ type: "go", stage: "response" })} />
          ) : null}

          {s.stage === "response" && s.exchanges.length ? (
            <PatientResponse
              lang={lang}
              mode={s.mode}
              text={s.exchanges[s.exchanges.length - 1].response.patientText}
              teachBackPrompt={s.exchanges[s.exchanges.length - 1].response.teachBackPrompt}
              inEnglish={s.exchanges[s.exchanges.length - 1].inEnglish}
              onAnswer={(answer) => {
                if (answer === "yes") metrics.current.teachback();
                dispatch({ type: "teach-back", answer });
              }}
            />
          ) : null}

          {s.stage === "hand-back" ? <HandBack lang={lang} onDone={() => dispatch({ type: "go", stage: "review" })} /> : null}

          {s.stage === "end" ? <EndScreen onNew={() => { metrics.current.reset(); dispatch({ type: "clear" }); }} /> : null}
        </div>
      </div>

      {warningLeft !== null ? (
        <div
          role="alertdialog"
          aria-labelledby="idle-title"
          aria-describedby="idle-desc"
          className="arrive fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl flex-col gap-4 rounded-[1.75rem] bg-navy p-5 text-white shadow-lift sm:flex-row sm:items-center sm:p-6"
        >
          <div className="flex-1" lang={idleLang} dir={idleDir}>
            <p id="idle-title" className="font-display text-xl font-bold">
              {idleText.stillThere}
            </p>
            <p id="idle-desc" className="mt-1 text-base text-on-navy-soft">
              {idleText.clearsIn(warningLeft)}
            </p>
            {holder === "Patient" && s.language !== "en" ? (
              <p lang="en" dir="ltr" className="mt-2 text-sm text-on-navy-soft">
                Still there? This session clears in {warningLeft}s.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            autoFocus
            onClick={keepAlive}
            lang={idleLang}
            className="press inline-flex min-h-12 items-center justify-center rounded-full bg-blue px-6 text-base font-semibold text-navy hover:bg-white"
          >
            {idleText.keepSession}
          </button>
        </div>
      ) : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
        {toast ? (
          <p className="arrive rounded-full bg-navy px-5 py-3 text-base font-semibold text-white shadow-lift">{toast}</p>
        ) : null}
      </div>
    </div>
  );
}
