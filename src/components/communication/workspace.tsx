"use client";

import { HomeLink } from "@/components/auth/home-link";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SynapseWordmark } from "@/components/brand/synapse-logo";
import {
  Mic,
  Speaker,
  Check,
  Shield,
  Handoff,
  Alert,
} from "@/components/home/icons";
import {
  PictoHead,
  PictoChest,
  PictoStomach,
  PictoBack,
  PictoArm,
  PictoLeg,
} from "@/components/home/icons";
import { BodyDiagram, BodyMap } from "@/components/input/body-diagram";
import { spotLabels, spotParts, spotsToInputs, type BodyFigure, type BodySpot } from "@/lib/input/body-parts";
import {
  PATIENT_LANGUAGES,
  PHRASES,
  CLINICIAN_REPLIES,
  type Mode,
  type PatientLanguage,
  type TranslateInput,
  type TranslateResponse,
  type RespondResponse,
} from "@/lib/mocks";
import { translate, respond, isReplyUnavailable } from "@/components/session/api";
import { SessionMetrics } from "@/components/session/metrics-lifecycle";
import { getGuidedQuestions } from "@/lib/questions/localization";
import { displayInputs } from "@/components/session/input-display";
import { STRINGS } from "@/components/session/strings";
import { useRecognition, useSpeak } from "@/components/session/use-speech";
import { useIdle } from "@/components/session/use-idle";
import { byEnglishName } from "./language-search";
import "./workspace.css";
import { workspaceStyles as s } from "./styles";
import { EkgLoader, VoiceBars } from "./motion";
import { SessionSetup, type SetupMode } from "./session-setup";
import { ScaleSlider as ScaleControl } from "@/components/session/scale-slider";
import { getSummaryPrefs } from "@/lib/summary-prefs";
import { addQuickReply, useQuickReplies } from "@/lib/quick-replies";
import {
  IntakeFree,
  IntakeGuided,
  ConfirmReadBack,
  SpeechFeedback,
} from "@/components/session/patient-screens";
import "./flow.css";
import { idleMsFor, SESSION_WARNING_MS, useSessionTimeout } from "@/lib/session-timeout";

const PICTOS = {
  head: PictoHead,
  chest: PictoChest,
  abdomen: PictoStomach,
  back: PictoBack,
  arm: PictoArm,
  leg: PictoLeg,
} as Record<string, typeof PictoHead>;

type Stage =
  | "setup"
  | "patient-ready"
  | "patient"
  | "patient-confirm"
  | "conversation"
  | "handoff"
  | "summary"
  | "teachback"
  | "end";
const NO_REPORT: { inputs: TranslateInput[]; spots: BodySpot[] } = {
  inputs: [],
  spots: [],
};
type Turn = {
  id: number;
  role: "patient" | "clinician";
  language: PatientLanguage;
  original: string;
  translation?: TranslateResponse;
  response?: RespondResponse;
  understood?: string;
  unavailable?: boolean;
  speechKind?: "dynamic" | "public";
  /** Exact places the patient touched on the body diagram (patient turns only). */
  spots?: BodySpot[];
};
const MODES: { id: Mode; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "deaf_hoh", label: "Deaf / HoH" },
  { id: "low_literacy", label: "Pictures / AAC" },
  { id: "mute", label: "Can’t speak" },
];
const COPY = {
  en: {
    pictures: "Pictures",
    type: "Type",
    send: "Add to conversation",
    flip: "Flip view",
    confirm: "Is this what you meant?",
    edit: "Change my message",
    review: "Pass to clinician",
    talk: "Your turn",
    help: "Ask for a human interpreter",
    yes: "Yes, I understand",
    no: "Please explain again",
    unsure: "I’m not sure",
  },
  es: {
    pictures: "Imágenes",
    type: "Escribir",
    send: "Añadir a la conversación",
    flip: "Girar vista",
    confirm: "¿Es esto lo que quiso decir?",
    edit: "Cambiar mi mensaje",
    review: "Pasar al profesional",
    talk: "Su turno",
    help: "Pedir un intérprete humano",
    yes: "Sí, entiendo",
    no: "Explíquelo de nuevo",
    unsure: "No estoy seguro",
  },
  ar: {
    pictures: "صور",
    type: "كتابة",
    send: "إضافة إلى المحادثة",
    flip: "تدوير العرض",
    confirm: "هل هذا ما تقصده؟",
    edit: "تغيير رسالتي",
    review: "أعط الجهاز للطبيب",
    talk: "دورك",
    help: "طلب مترجم بشري",
    yes: "نعم، أفهم",
    no: "يرجى الشرح مجددًا",
    unsure: "لست متأكدًا",
  },
  "zh-Hans": {
    pictures: "图片",
    type: "打字",
    send: "添加到对话",
    flip: "翻转视图",
    confirm: "这是您想表达的吗？",
    edit: "修改我的信息",
    review: "交给医护人员",
    talk: "轮到您了",
    help: "请求人工口译员",
    yes: "是的，我明白",
    no: "请再解释一次",
    unsure: "我不确定",
  },
};

function isClinicianRole(value: string): boolean {
  return value === "clinician";
}

function Action({
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={primary ? s.primary : s.quiet}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export function CommunicationWorkspace() {
  const [stage, setStage] = useState<Stage>("setup");
  const [language, setLanguage] = useState<PatientLanguage>("es");
  const [mode, setMode] = useState<Mode>("standard");
  const [role, setRole] = useState<"patient" | "clinician">("clinician");
  const [setupMode, setSetupMode] = useState<SetupMode>("icu");
  const [patientPath, setPatientPath] = useState<"free" | "guided">("free");
  // How this clinician likes to read and copy the summary (dashboard "How I read summaries"). Read once when the visit
  // starts; this page only renders in the browser (it sits behind the sign-in check), so it cannot disagree with the server.
  const [summaryPrefs] = useState(getSummaryPrefs);
  // Which body drawing the patient and clinician see. Display only: not sent or stored.
  const [bodyFigure, setBodyFigure] = useState<BodyFigure>("male");
  // The patient's last submitted report, kept so a failed translation can be retried or shown as-is.
  const [patientReport, setPatientReport] = useState<{
    inputs: TranslateInput[];
    spots: BodySpot[];
  }>(NO_REPORT);
  const patientInputs = patientReport.inputs;
  const [readyForReply, setReadyForReply] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<Turn | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clearConfirm, setClearConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [severity, setSeverity] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  // Colour-blind friendly colours for this visit only (set on the patient form like the other display options).
  const [colourBlind, setColourBlind] = useState(false);
  const [audio, setAudio] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [help, setHelp] = useState(false);
  const [sound, setSound] = useState(false);
  const [draft, setDraft] = useState("");
  const savedReplies = useQuickReplies();
  const [channel, setChannel] = useState<"voice" | "pictures" | "type">(
    "voice",
  );
  const [selected, setSelected] = useState<TranslateInput[]>([]);
  const [bodySpots, setBodySpots] = useState<BodySpot[]>([]);
  const [body, setBody] = useState(false);
  const [copied, setCopied] = useState("");
  const version = useRef(0);
  const metrics = useRef(new SessionMetrics());
  const lock = useRef(false);
  const nextId = useRef(1);
  const main = useRef<HTMLElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const meta = PATIENT_LANGUAGES.find((l) => l.code === language)!;
  const guidedQuestions = useMemo(() => getGuidedQuestions(language), [language]);
  const text = STRINGS[language];
  const copy = COPY[language];
  const speech = useRecognition(role === "patient" ? meta.speech : "en-US");
  const voice = useSpeak();
  const { stop: stopVoice } = voice;
  const { setFinalText } = speech;
  const canAudio = mode !== "deaf_hoh";
  const message = [draft, speech.finalText].filter(Boolean).join(" ").trim();
  const lastReply = [...turns].reverse().find((t) => t.role === "clinician");
  const patientScreen = [
    "patient",
    "patient-confirm",
    "handoff",
    "teachback",
  ].includes(stage);
  const holder = patientScreen ? "Patient" : "Clinician";
  const lang = {
    code: meta.code,
    dir: meta.dir,
    speech: meta.speech,
    english: meta.english,
    name: meta.name,
  };

  function clear(end = false) {
    metrics.current.reset();
    version.current++;
    lock.current = false;
    stopVoice();
    window.speechSynthesis?.cancel();
    speech.stop();
    speech.setFinalText("");
    setSeverity(null);
    setTurns([]);
    setPending(null);
    setDraft("");
    setSelected([]);
    setBodySpots([]);
    setBusy(false);
    setError("");
    setClearConfirm(false);
    setEnding(false);
    setHelp(false);
    setSound(false);
    setCopied("");
    setFlipped(false);
    setRole("clinician");
    setPatientReport(NO_REPORT);
    setStage(end ? "end" : "setup");
  }
  // Invalidate in-flight work on navigation, React Activity hiding, and bfcache restoration.
  useEffect(() => {
    const wipe = () => {
      metrics.current.reset();
      version.current++;
      lock.current = false;
      setTurns([]);
      setPending(null);
      setDraft("");
      setSelected([]);
      setBodySpots([]);
      setBusy(false);
      setError("");
      setSeverity(null);
      setFinalText("");
      setPatientReport(NO_REPORT);
      setStage("setup");
      stopVoice();
      window.speechSynthesis?.cancel();
    };
    window.addEventListener("pagehide", wipe);
    const restore = (e: PageTransitionEvent) => {
      if (e.persisted) wipe();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("pagehide", wipe);
      window.removeEventListener("pageshow", restore);
      wipe();
    };
  }, [setFinalText, stopVoice]);
  const firstStage = useRef(true);
  useEffect(() => {
    const el = main.current;
    el?.focus({ preventScroll: true });
    // A new screen starts at the top at once. The page's smooth scrolling is for anchor links, not for this.
    window.scrollTo({ top: 0, behavior: "instant" });
    const first = firstStage.current;
    firstStage.current = false;
    // Continuity cue: the new screen settles in. Handoff screens carry their own pass motion, so they skip it.
    const handoffScreen = stage === "handoff" || stage === "end" || stage === "patient-ready";
    if (first || handoffScreen || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { opacity: 0.55, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }, [stage]);
  useEffect(() => {
    stream.current?.scrollTo({ top: stream.current.scrollHeight });
  }, [turns.length, pending]);
  const sessionTimeout = useSessionTimeout();
  const idle = useIdle({
    enabled:
      stage !== "end" &&
      (stage !== "setup" ||
        turns.length > 0 ||
        patientInputs.length > 0 ||
        !!draft),
    idleMs: idleMsFor(sessionTimeout),
    graceMs: SESSION_WARNING_MS,
    onExpire: () => clear(true),
  });

  function changeContext(nextLanguage: PatientLanguage, nextRole = role) {
    if (busy || pending) return;
    speech.stop();
    speech.setFinalText("");
    stopVoice();
    window.speechSynthesis?.cancel();
    setDraft("");
    setSelected([]);
    setBodySpots([]);
    setSeverity(null);
    setError("");
    setLanguage(nextLanguage);
    setRole(nextRole);
    if (nextRole === "clinician") setChannel("type");
  }
  function selectMode(next: Mode) {
    speech.stop();
    stopVoice();
    window.speechSynthesis?.cancel();
    setMode(next);
    if (next === "deaf_hoh") setAudio(false);
    setChannel(
      role === "clinician"
        ? "type"
        : next === "low_literacy"
          ? "pictures"
          : next === "mute" || next === "deaf_hoh"
            ? "type"
            : "voice",
    );
  }
  function toggle(questionId: string, value: string) {
    setSelected((current) =>
      current.some((i) => i.questionId === questionId && i.value === value)
        ? current.filter(
            (i) => i.questionId !== questionId || i.value !== value,
          )
        : [
            ...current.filter(
              (i) => questionId !== "how_long" || i.questionId !== questionId,
            ),
            { questionId, kind: "option", value },
          ],
    );
  }
  async function send() {
    if (role === "clinician" && !message) return;
    if (
      lock.current ||
      pending ||
      speech.listening ||
      (!message && !selected.length && !bodySpots.length && severity === null)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    const token = version.current;
    const context = {
      language,
      mode,
      readingLevel: mode === "low_literacy" ? (2 as const) : (3 as const),
    };
    try {
      const id = nextId.current++;
      if (role === "patient") {
        const inputs: TranslateInput[] = [
          ...(severity !== null
            ? [{ questionId: "how_strong", kind: "option" as const, value: `s${severity}` }]
            : []),
          ...selected,
          ...spotsToInputs(bodySpots),
          ...(message ? [{ kind: "text" as const, value: message }] : []),
        ];
        const translation = await translate({ context, inputs });
        if (version.current !== token) return;
        setPending({
          id,
          role,
          language,
          original: translation.original,
          translation,
          spots: bodySpots,
          speechKind: inputs.some(input => input.kind === "text" || input.kind === "speech_transcript") ? "dynamic" : "public",
        });
      } else {
        const response = await respond({ context, message });
        if (version.current !== token) return;
        setTurns((current) => [
          ...current,
          {
            id,
            role,
            language,
            original: message,
            response,
            unavailable: isReplyUnavailable(response),
          },
        ]);
        if (audio && canAudio)
          voice.speak(
            response.readAloudText,
            isReplyUnavailable(response) ? "en-US" : meta.speech,
          );
        setDraft("");
        speech.setFinalText("");
        setReadyForReply(true);
        setStage("patient-ready");
      }
    } catch {
      if (version.current === token)
        setError(
          "Couldn’t prepare this message. Your draft is still here. Try again, type instead, or ask for an interpreter.",
        );
    } finally {
      if (version.current === token) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  function confirm() {
    if (!pending) return;
    metrics.current.firstMessage();
    setTurns((current) => [...current, pending]);
    setStage("handoff");
    setPending(null);
    setDraft("");
    speech.setFinalText("");
    setSelected([]);
    setBodySpots([]);
    setSeverity(null);
    if (audio && canAudio)
      voice.speak(pending.translation!.backTranslation, meta.speech, { kind: pending.speechKind });
  }
  async function submitPatient(inputs: TranslateInput[], spots: BodySpot[] = []) {
    if (lock.current) return;
    const token = version.current;
    lock.current = true;
    setPatientReport({ inputs, spots });
    setPending(null);
    setError("");
    setBusy(true);
    setStage("patient-confirm");
    try {
      const translation = await translate({
        context: {
          language,
          mode,
          readingLevel: mode === "low_literacy" ? 2 : 3,
        },
        inputs,
      });
      if (version.current !== token) return;
      setPending({
        id: nextId.current++,
        role: "patient",
        language,
        original: translation.original,
        translation,
        spots,
        speechKind: inputs.some(input => input.kind === "text" || input.kind === "speech_transcript") ? "dynamic" : "public",
      });
    } catch {
      if (version.current === token) setError("unavailable");
    } finally {
      if (version.current === token) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  function confirmPatient() {
    if (pending) {
      confirm();
      return;
    }
    // A failed service must still let the clinician see the patient's own words.
    if (busy || !patientInputs.length) return;
    metrics.current.firstMessage();
    setTurns((current) => [
      ...current,
      {
        id: nextId.current++,
        role: "patient",
        language,
        original: displayInputs(patientInputs, language),
        unavailable: true,
        spots: patientReport.spots,
        speechKind: patientInputs.some(input => input.kind === "text" || input.kind === "speech_transcript") ? "dynamic" : "public",
      },
    ]);
    setStage("handoff");
  }
  const shortcut = useRef({
    start: speech.start,
    stop: speech.stop,
    listening: speech.listening,
    enabled: false,
  });
  useEffect(() => {
    shortcut.current = {
      start: speech.start,
      stop: speech.stop,
      listening: speech.listening,
      enabled:
        stage === "conversation" && channel === "voice" && !busy && !pending,
    };
  });
  useEffect(() => {
    const press = (e: KeyboardEvent) => {
      if (
        e.code !== "Space" ||
        e.repeat ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        !(e.target instanceof HTMLElement) ||
        e.target.closest(
          "button,input,textarea,select,a,[contenteditable=true]",
        ) ||
        !shortcut.current.enabled
      )
        return;
      e.preventDefault();
      if (shortcut.current.listening) shortcut.current.stop();
      else shortcut.current.start();
    };
    window.addEventListener("keydown", press);
    return () => window.removeEventListener("keydown", press);
  }, []);
  const latestPatient = [...turns].reverse().find((t) => t.translation);
  const symptomList = [
    ...new Set(turns.flatMap((t) => t.translation?.summary.symptoms ?? [])),
  ];
  const flags = [
    ...new Set(turns.flatMap((t) => t.translation?.summary.redFlags ?? [])),
  ];
  // "Flags to check" can lead the summary (clinician setting); they are never hidden.
  const flagsBlock = flags.length ? (
                  <div className={s.flags}>
                    <h3>
                      <Alert size={20} /> Flags to check
                    </h3>
                    <ul>
                      {flags.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null;
  // Every spot from every patient report, so overlapping reports read as one heat map.
  const allSpots = useMemo(() => turns.flatMap((t) => t.spots ?? []), [turns]);
  const bodyParts = spotParts(bodySpots);
  async function copySummary() {
    const conversation = turns
      .map((t) =>
        t.translation
          ? `Patient report (demo): ${t.translation.translated}\nOriginal: ${t.original}\nBack-translation: ${t.translation.backTranslation}`
          : t.role === "patient"
            ? `Patient report (untranslated): ${t.original}`
            : `Clinician: ${t.original}\nTeach-back: ${t.understood ?? "Not checked"}`,
      )
      .join("\n\n");
    // What goes on the clipboard follows the clinician's setting. Same facts as the screen, English, no identifiers.
    const summaryText = [
      "Synapse summary (communication aid, demo; confirm with the patient)",
      `Chief complaint: ${latestPatient?.translation?.summary.chiefComplaint ?? "Not stated"}`,
      `Symptoms: ${symptomList.join(", ") || "Not stated"}`,
      `Duration: ${latestPatient?.translation?.summary.duration ?? "Not stated"}`,
      allSpots.length ? `Where it hurts: ${spotLabels(allSpots)}` : null,
      flags.length ? `Flags to check: ${flags.join("; ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const content =
      summaryPrefs.copy === "summary" ? summaryText : summaryPrefs.copy === "both" ? `${summaryText}\n\n${conversation}` : conversation;
    try {
      await navigator.clipboard.writeText(content);
      setCopied("Copied. Review before adding to any record.");
    } catch {
      setCopied("Copy unavailable. Select the text to copy it manually.");
    }
  }

  const read = (value: string, lang = meta.speech, kind: "dynamic" | "public" = "dynamic") =>
    canAudio && voice.supported ? (
      <button type="button" onClick={() => voice.speak(value, lang, { kind })}>
        <Speaker size={18} /> {text.readAloud}
      </button>
    ) : null;

  return (
    <div
      className={`${s.root} ${highContrast ? s.high : ""} ${mode === "deaf_hoh" ? s.caption : ""}`}
      data-cvd={colourBlind ? "on" : undefined}
      style={{ "--scale": scale } as CSSProperties}
    >
      <header className={s.header}>
        <div className={s.headerInner}>
          <HomeLink aria-label="Synapse home">
            <SynapseWordmark accent="#77a0c4" />
          </HomeLink>
          <span className={s.holder} aria-live="polite">
            {holder} has the device
          </span>
          <div className={s.headerActions}>
            {clearConfirm ? (
              <>
                {
                  <button type="button" onClick={() => setClearConfirm(false)}>Cancel</button>
                }
                <button type="button" className="sc-confirmClear" onClick={() => clear(ending)}>{ending ? "End and clear" : "Clear now"}</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEnding(false);
                  setClearConfirm(true);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {(stage === "conversation" || stage === "summary") &&
        isClinicianRole(role) ? (
          <section className={s.toolbar} aria-label="Accessibility controls">
            <button
              type="button"
              className={s.accessToggle}
              aria-expanded={accessOpen}
              aria-controls="communication-accessibility"
              onClick={() => setAccessOpen(!accessOpen)}
            >
              Accessibility · {MODES.find((m) => m.id === mode)?.label} ·{" "}
              {scale * 100}% <span>{accessOpen ? "Close" : "Change"}</span>
            </button>
            <div
              id="communication-accessibility"
              className={s.toolbarInner}
              data-open={accessOpen}
            >
              <div
                className={s.group}
                role="group"
                aria-label="Communication mode"
              >
                {MODES.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    aria-pressed={mode === m.id}
                    onClick={() => selectMode(m.id)}
                    disabled={busy || !!pending}
                  >
                    {mode === m.id ? "✓ " : ""}
                    {m.label}
                  </button>
                ))}
              </div>
              <div className={`${s.group} ${s.tools}`}>
                <div className={s.group} role="group" aria-label="Text size">
                  {[1, 1.25, 1.5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      aria-pressed={scale === n}
                      onClick={() => setScale(n)}
                    >
                      {n * 100}%
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-pressed={highContrast}
                  onClick={() => setHighContrast(!highContrast)}
                >
                  High contrast
                </button>
                <button
                  type="button"
                  aria-pressed={colourBlind}
                  onClick={() => setColourBlind(!colourBlind)}
                >
                  Colour-blind friendly
                </button>
                {canAudio ? (
                  <button
                    type="button"
                    aria-pressed={audio}
                    onClick={() => {
                      setAudio(!audio);
                      stopVoice();
                      window.speechSynthesis?.cancel();
                    }}
                  >
                    Read replies aloud {audio ? "on" : "off"}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </header>
      <main
        ref={main}
        tabIndex={-1}
        className={
          stage === "handoff" || stage === "end" || stage === "patient-ready"
            ? s.handoff
            : stage === "setup"
              ? undefined
              : s.main
        }
      >
        {canAudio ? <SpeechFeedback status={voice.status} language={language} /> : null}
        {stage === "setup" ? (
          <SessionSetup
            language={language}
            mode={setupMode}
            path={patientPath}
            onLanguage={(next) => { stopVoice(); setLanguage(next); }}
            onMode={(next) => {
              setSetupMode(next);
              if (next !== "icu") {
                setMode(next);
                setPatientPath(next === "standard" ? "free" : "guided");
              }
            }}
            onPath={setPatientPath}
            figure={bodyFigure}
            onFigure={setBodyFigure}
            displayControls={
              <div className="sf-display-controls">
                <div role="group" aria-label="Patient text size">
                  {[1, 1.25, 1.5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      aria-pressed={scale === n}
                      onClick={() => setScale(n)}
                    >
                      {n * 100}% text
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-pressed={highContrast}
                  onClick={() => setHighContrast(!highContrast)}
                >
                  High contrast
                </button>
                <button
                  type="button"
                  aria-pressed={colourBlind}
                  onClick={() => setColourBlind(!colourBlind)}
                >
                  Colour-blind friendly
                </button>
                {mode !== "deaf_hoh" && setupMode !== "icu" ? (
                  <button
                    type="button"
                    aria-pressed={audio}
                    onClick={() => setAudio(!audio)}
                  >
                    Read replies aloud {audio ? "on" : "off"}
                  </button>
                ) : null}
              </div>
            }
            onStart={() => {
              setReadyForReply(false);
              setStage("patient-ready");
            }}
          />
        ) : null}
        {stage === "patient-ready" ? (
          <>
            <Image
              src="/communication/synapse-gemini.png"
              alt=""
              width={640}
              height={400}
            />
            <Handoff size={48} className="sc-pass sc-pass-to-patient" />
            <h1>Pass the device to the patient</h1>
            <p>
              {setupMode === "icu"
                ? "Eye mode is ready. When the board opens, choose Intake or Conversation, then tap Ready once you are both looking at the screen; the patient then follows a moving dot for 30 seconds."
                : readyForReply
                  ? lastReply?.unavailable
                    ? "Translation is unavailable. Return to the clinician or ask for an interpreter."
                    : `Your reply is ready in ${meta.english}.`
                  : `${meta.english} · ${MODES.find((m) => m.id === mode)?.label}. The patient will see one clear task at a time.`}
            </p>
            {setupMode === "icu" ? (
              <Link className="sf-handoff-choice" href="/icu">
                Open patient’s Eye mode board
              </Link>
            ) : (
              <button
                type="button"
                className="sf-handoff-choice"
                lang={language}
                dir={meta.dir}
                onClick={() => {
                  // Start when the patient accepts the first handoff, after setup can still change.
                  metrics.current.start(mode);
                  setRole("patient");
                  setStage(readyForReply ? "teachback" : "patient");
                }}
              >
                {
                  {
                    en: "I’m ready",
                    es: "Estoy listo",
                    ar: "أنا مستعد",
                    "zh-Hans": "我准备好了",
                  }[language]
                }
              </button>
            )}
            <Action
              label="Back to clinician"
              onClick={() => {
                setRole("clinician");
                setStage(readyForReply ? "conversation" : "setup");
              }}
            />
          </>
        ) : null}
        {stage === "patient" ? (
          <div className="sf-patient">
            {patientPath === "guided" ? (
              <p className="sf-note" lang={language} dir={meta.dir}>
                {text.noNames}
              </p>
            ) : null}
            {patientPath === "guided" ? (
              <IntakeGuided
                lang={lang}
                mode={mode}
                figure={bodyFigure}
                initialInputs={patientInputs}
                initialSpots={patientReport.spots}
                onSubmit={submitPatient}
                onUnavailable={() => setPatientPath("free")}
              />
            ) : (
              <IntakeFree
                initialPhrases={patientInputs.filter(i => i.kind === "option" && i.value.startsWith("phrase:")).map(i => i.value.slice(7))}
                lang={lang}
                mode={mode}
                initialText={patientInputs
                  .filter(
                    (i) => i.kind === "text" || i.kind === "speech_transcript",
                  )
                  .map((i) => i.value)
                  .join(" ")}
                onSubmit={submitPatient}
              />
            )}
          </div>
        ) : null}
        {stage === "patient-confirm" ? (
          <div className="sf-patient">
            <ConfirmReadBack
              lang={lang}
              mode={mode}
              translation={pending?.translation}
              kind={pending?.speechKind ?? "public"}
              failed={!!error && !busy}
              fallbackText={displayInputs(patientInputs, language)}
              onYes={confirmPatient}
              onRetry={() =>
                submitPatient(patientReport.inputs, patientReport.spots)
              }
              onTryAgain={() => {
                setError("");
                setStage("patient");
              }}
            />
          </div>
        ) : null}
        {stage === "end" ? (
          <>
            <Image
              src="/communication/synapse-gemini.png"
              alt=""
              width={640}
              height={400}
            />
            <h1>Session cleared</h1>
            <p>
              Conversation, drafts, and summaries have been removed from this
              session.
            </p>
            {
              <Action
                label={"Start a new conversation"}
                onClick={() => clear(false)}
                primary={true}
              />
            }
          </>
        ) : null}
        {stage === "handoff" ? (
          <>
            <Image
              src="/communication/synapse-gemini.png"
              alt=""
              width={640}
              height={400}
            />
            <Handoff size={48} className="sc-pass sc-pass-to-clinician" />
            <h1 lang={language} dir={meta.dir}>
              {text.passToClinician}
            </h1>
            <p>
              Pass the device to the clinician. The clinical summary stays
              hidden until they continue.
            </p>
            {
              <Action
                label={"I’m the clinician"}
                onClick={() => {
                  setStage("summary");
                  changeContext(language, "clinician");
                }}
                primary={true}
              />
            }
            {
              <Action
                label={text.back}
                onClick={() =>
                  setStage(readyForReply ? "teachback" : "patient")
                }
              />
            }
          </>
        ) : null}
        {stage === "conversation" && isClinicianRole(role) ? (
          <>
            <div className={s.intro}>
              <div>
                <h1>Continue the conversation.</h1>
                <p>
                  Review what was shared, then prepare a reply for the patient.
                </p>
              </div>
              <span className={s.badge}>
                <Shield size={17} /> Synthetic demo · Nothing saved
              </span>
            </div>
            <div className={s.split}>
              <section className={s.panel} aria-label="Conversation">
                <div className={s.panelHead}>
                  <div>
                    <h2>Conversation</h2>
                    <p>Clinician · English / Patient · {meta.english}</p>
                  </div>
                  {
                    <Action
                      label={copy.flip}
                      onClick={() => setFlipped(!flipped)}
                    />
                  }
                </div>
                <div
                  className={s.stream}
                  ref={stream}
                  role="log"
                  aria-label="Messages"
                  aria-live="polite"
                  style={{ transform: flipped ? "rotate(180deg)" : undefined }}
                >
                  {!turns.length ? (
                    <div className={s.empty}>
                      <Handoff size={36} />
                      <h3>Start with what matters.</h3>
                      <p lang={language} dir={meta.dir}>
                        {text.intakeTitle}
                      </p>
                      <p>Messages appear here after you check them.</p>
                    </div>
                  ) : (
                    turns.map((t) => (
                      <article
                        key={t.id}
                        className={s.bubble}
                        data-role={t.role}
                      >
                        <div className={s.role}>
                          <span>
                            {t.role === "patient" ? "Patient" : "Clinician"}
                          </span>
                          <span>{t.language.toUpperCase()}</span>
                        </div>
                        <p
                          lang={t.role === "patient" ? t.language : "en"}
                          dir={
                            t.role === "patient" && t.language === "ar"
                              ? "rtl"
                              : "ltr"
                          }
                        >
                          {t.original}
                        </p>
                        <p
                          className={s.translation}
                          lang={
                            t.role === "patient"
                              ? "en"
                              : t.unavailable
                                ? "en"
                                : t.language
                          }
                          dir={
                            t.role === "clinician" &&
                            t.language === "ar" &&
                            !t.unavailable
                              ? "rtl"
                              : "ltr"
                          }
                        >
                          {t.translation?.translated ?? t.response?.patientText}
                        </p>
                        {t.translation?.lowConfidence.length ||
                        t.unavailable ? (
                          <p className={s.translation}>
                            Demo only:{" "}
                            {t.role === "patient"
                              ? t.translation?.lowConfidence.map((c) => c.reason).join(" ")
                              : "translation unavailable; ask an interpreter."}
                          </p>
                        ) : null}
                        {t.spots?.length ? (
                          <BodyMap
                            figure={bodyFigure}
                            spots={t.spots}
                            className="mt-2 w-full max-w-64"
                          />
                        ) : null}
                        {t.understood ? (
                          <p className={s.translation}>
                            Teach-back: {t.understood}
                          </p>
                        ) : null}
                        {read(
                          t.role === "patient"
                            ? t.original
                            : (t.response?.readAloudText ?? ""),
                          t.role === "patient"
                            ? PATIENT_LANGUAGES.find(
                                (l) => l.code === t.language,
                              )!.speech
                            : t.unavailable
                              ? "en-US"
                              : PATIENT_LANGUAGES.find(
                                  (l) => l.code === t.language,
                                )!.speech,
                          t.speechKind ?? "dynamic",
                        )}
                      </article>
                    ))
                  )}
                </div>
                {mode === "deaf_hoh" ? (
                  <div className={s.notice}>
                    <p>
                      Sound notices are manual demo cues; this app does not
                      listen for room sounds.
                    </p>
                    <button
                      type="button"
                      className={s.quiet}
                      onClick={() => setSound(!sound)}
                    >
                      {" "}
                      {sound
                        ? "Dismiss sound notice"
                        : "Show demo sound notice"}
                    </button>
                    {sound ? (
                      <p role="status">
                        <Alert size={18} /> Demo cue: a door knock.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <p className={s.notice}>
                  Demo translations need a fluent speaker’s review. Use a
                  qualified interpreter when needed.
                </p>
              </section>
              <section className={s.panel} aria-label="Message input">
                <div className={s.panelHead}>
                  <div>
                    <h2>
                      {role === "patient" ? copy.talk : "Clinician’s turn"}
                    </h2>
                    <p>
                      {role === "patient"
                        ? text.noNames
                        : "Keep your reply short and plain."}
                    </p>
                  </div>
                </div>
                <div className={s.inputBody}>
                  <div
                    className={s.group}
                    role="group"
                    aria-label="Who is speaking"
                    style={{ marginBottom: 20 }}
                  >
                    <button
                      type="button"
                      className={s.quiet}
                      aria-pressed={role === "patient"}
                      disabled={busy || !!pending}
                      onClick={() => changeContext(language, "patient")}
                    >
                      Patient {role === "patient" ? "✓" : ""}
                    </button>
                    <button
                      type="button"
                      className={s.quiet}
                      aria-pressed={role === "clinician"}
                      disabled={busy || !!pending}
                      onClick={() => changeContext(language, "clinician")}
                    >
                      Clinician {role === "clinician" ? "✓" : ""}
                    </button>
                  </div>
                  <label className={s.languages}>
                    <span>Patient language</span>
                    <select
                      value={language}
                      disabled={busy || !!pending}
                      onChange={(e) => changeContext(e.target.value as PatientLanguage)}
                    >
                      {[...PATIENT_LANGUAGES].sort(byEnglishName).map((l) => (
                        <option key={l.code} value={l.code} lang={l.code}>
                          {l.name === l.english ? l.name : `${l.name} · ${l.english}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div
                    lang={role === "patient" ? language : "en"}
                    dir={role === "patient" ? meta.dir : "ltr"}
                  >
                    {pending ? (
                      <div>
                        <h3>{copy.confirm}</h3>
                        <p className={s.notice}>
                          {pending.translation?.backTranslation}
                        </p>
                        <p lang="en" dir="ltr" className={s.notice}>
                          Read-back uses the demo service. Check your meaning
                          before adding.
                        </p>
                        <button
                          type="button"
                          className={`${s.primary} ${s.send}`}
                          onClick={confirm}
                        >
                          <Check size={20} />
                          {text.yesRight}
                        </button>
                        <button
                          type="button"
                          className={`${s.quiet} ${s.send}`}
                          onClick={() => setPending(null)}
                        >
                          {copy.edit}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className={s.tabs}
                          role="group"
                          aria-label={role === "patient" ? `${copy.pictures} / ${copy.type}` : "Input method"}
                        >
                          {(["voice", "pictures", "type"] as const)
                            .filter(
                              (c) => role === "patient" || c !== "pictures",
                            )
                            .map((c) => (
                              <button
                                type="button"
                                key={c}
                                aria-pressed={channel === c}
                                disabled={busy}
                                onClick={() => {
                                  speech.stop();
                                  setChannel(c);
                                }}
                              >
                                {c === "voice"
                                  ? text.speak
                                  : c === "pictures"
                                    ? copy.pictures
                                    : copy.type}
                              </button>
                            ))}
                        </div>
                        {channel === "voice" ? (
                          <div className={s.micArea}>
                            <button
                              type="button"
                              className={s.mic}
                              aria-pressed={speech.listening}
                              disabled={busy || !speech.supported}
                              onClick={() =>
                                speech.listening
                                  ? speech.stop()
                                  : speech.start()
                              }
                            >
                              <Mic size={40} />
                              {speech.listening ? text.stop : text.speak}
                            </button>
                            <p role="status">
                              {speech.listening
                                ? text.listening
                                : speech.supported
                                  ? "Space to start / stop · or tap the microphone"
                                  : text.micUnavailable}
                            </p>
                            {speech.listening ? <VoiceBars active /> : null}
                            {speech.interim ? (
                              <p lang={language} dir={meta.dir}>
                                {speech.interim}
                              </p>
                            ) : null}
                            {speech.error ? (
                              <p role="alert">
                                {text.micUnavailable} {text.typeInstead}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {channel === "pictures" && !guidedQuestions ? (
                          <p className={s.notice} role="status">
                            {text.couldNotTranslate}{" "}
                            <button type="button" onClick={() => setChannel("type")}>{text.typeInstead}</button>
                          </p>
                        ) : null}
                        {channel === "pictures" && guidedQuestions ? (
                          <>
                            <h3>{guidedQuestions[0].text[language]}</h3>
                            <div className={s.tiles}>
                              {guidedQuestions[0].options.map((o) => (
                                <button
                                  type="button"
                                  key={o.id}
                                  className={s.tile}
                                  aria-pressed={selected.some(
                                    (i) =>
                                      i.value === o.id &&
                                      i.questionId === "where",
                                  )}
                                  onClick={() => toggle("where", o.id)}
                                  disabled={busy}
                                >
                                  {(() => {
                                    const Icon = PICTOS[o.pictogram ?? "head"];
                                    return Icon ? <Icon size={32} /> : null;
                                  })()}
                                  {o.text[language]}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className={`${s.quiet} ${s.send}`}
                              onClick={() => setBody(!body)}
                            >
                              {body ? text.showList : text.showBody}
                            </button>
                            {body ? (
                              <BodyDiagram
                                figure={bodyFigure}
                                lang={language}
                                spots={bodySpots}
                                regions={[
                                  "head",
                                  "neck",
                                  "chest",
                                  "abdomen",
                                  "back",
                                  "left_arm",
                                  "right_arm",
                                  "left_leg",
                                  "right_leg",
                                ]}
                                onSelect={() => {}}
                                onSpotsChange={setBodySpots}
                              />
                            ) : null}
                            <div>
                              <h3 id="pain-question" className={s.question}>
                                {
                                  {
                                    en: "Pain: 0 is none, 10 is the worst",
                                    es: "Dolor: 0 es nada, 10 es el peor",
                                    ar: "الألم: ٠ لا ألم، ١٠ أسوأ ألم",
                                    "zh-Hans": "疼痛：0为不痛，10为最痛",
                                  }[language]
                                }
                              </h3>
                              <ScaleControl
                                value={severity}
                                onChange={setSeverity}
                                label={
                                  {
                                    en: "Pain: 0 is none, 10 is the worst",
                                    es: "Dolor: 0 es nada, 10 es el peor",
                                    ar: "الألم: ٠ لا ألم، ١٠ أسوأ ألم",
                                    "zh-Hans": "疼痛：0为不痛，10为最痛",
                                  }[language]
                                }
                                locale={language}
                              />
                            </div>
                            {[guidedQuestions[1], guidedQuestions[4]].map((q) => (
                              <div key={q.id}>
                                <h3 className={s.question}>
                                  {q.text[language]}
                                </h3>
                                <div className={s.choices}>
                                  {q.options.map((o) => (
                                    <button
                                      type="button"
                                      key={o.id}
                                      aria-pressed={selected.some(
                                        (i) =>
                                          i.questionId === q.id &&
                                          i.value === o.id,
                                      )}
                                      disabled={busy}
                                      onClick={() => toggle(q.id, o.id)}
                                    >
                                      {o.text[language]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </>
                        ) : null}
                        {role === "patient" &&
                        (channel === "type" || mode === "mute") ? (
                          <div
                            className={s.choices}
                            style={{ marginBottom: 20 }}
                          >
                            {PHRASES.map((p) => (
                              <button
                                type="button"
                                key={p.id}
                                disabled={busy}
                                aria-pressed={selected.some((i) => i.questionId === "chief_complaint" && i.value === `phrase:${p.id}`)}
                                onClick={() => {
                                  toggle("chief_complaint", `phrase:${p.id}`);
                                  if (mode === "mute" && audio)
                                    voice.speak(p.text[language], meta.speech, { kind: "public" });
                                }}
                              >
                                {p.text[language]}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {role === "clinician" ? (
                          <div
                            className={s.choices}
                            style={{ marginBottom: 20 }}
                          >
                            {[
                              ...savedReplies.map((reply) => ({ en: reply })),
                              { en: "Please point to where it hurts." },
                              ...CLINICIAN_REPLIES,
                            ].map((r) => (
                              <button
                                type="button"
                                key={r.en}
                                disabled={busy}
                                onClick={() => setDraft(r.en)}
                              >
                                {r.en}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <label
                          htmlFor="communication-draft"
                          className={s.label}
                        >
                          {role === "patient"
                            ? text.yourMessage
                            : "Your message"}
                        </label>
                        <textarea
                          id="communication-draft"
                          className={s.field}
                          rows={3}
                          value={message}
                          disabled={busy || speech.listening}
                          onChange={(e) => {
                            setDraft(e.target.value);
                            speech.setFinalText("");
                          }}
                        />
                        {role === "clinician" && message.trim() && !savedReplies.includes(message.trim())
                          && !CLINICIAN_REPLIES.some((r) => r.en === message.trim())
                          && message.trim() !== "Please point to where it hurts." ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => addQuickReply(message)}
                          >
                            Save as quick reply
                          </button>
                        ) : null}
                        {selected.length + bodyParts.length ? (
                          <p role="status">
                            {selected.length + bodyParts.length}{" "}
                            {language === "en" ? "selections" : "✓"}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          className={`${s.primary} ${s.send}`}
                          disabled={
                            busy ||
                            speech.listening ||
                            (!message &&
                              !selected.length &&
                              !bodySpots.length &&
                              severity === null)
                          }
                          onClick={send}
                        >
                          {busy ? (
                            <EkgLoader label={text.working} />
                          ) : role === "patient" ? (
                            copy.send
                          ) : (
                            "Translate reply"
                          )}
                        </button>
                        {role === "clinician" ? (
                          <p className={s.notice}>
                            Replies use the configured translation service.
                            Review the meaning; some translations may be unavailable.
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                  {error ? (
                    <p className={s.alert} role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          </>
        ) : null}
        {stage === "summary" ? (
          <>
            <div className={s.intro}>
              <div>
                <h1>Two views. One understanding.</h1>
                <p>Review what was shared before deciding what comes next.</p>
              </div>
              <span className={s.badge}>Clinician review · Demo</span>
            </div>
            <div className={s.summaryGrid}>
              <section className={s.sheet}>
                <h2>Patient recap</h2>
                <div lang={language} dir={meta.dir}>
                  <h3>{text.yourMessage}</h3>
                  {turns
                    .filter((t) => t.translation)
                    .map((t) => (
                      <p
                        key={t.id}
                        lang={t.language}
                        dir={t.language === "ar" ? "rtl" : "ltr"}
                      >
                        {t.translation!.backTranslation}
                      </p>
                    ))}
                  {turns
                    .filter((t) => t.role === "patient" && !t.translation)
                    .map((t) => (
                      <p
                        key={t.id}
                        lang={t.language}
                        dir={t.language === "ar" ? "rtl" : "ltr"}
                      >
                        {t.original}
                      </p>
                    ))}
                  <h3>{text.clinicianSays}</h3>
                  {turns.filter((t) => t.response).length ? (
                    turns
                      .filter((t) => t.response)
                      .map((t) => (
                        <p
                          key={t.id}
                          lang={t.unavailable ? "en" : t.language}
                          dir={
                            !t.unavailable && t.language === "ar"
                              ? "rtl"
                              : "ltr"
                          }
                        >
                          {t.response!.patientText}
                        </p>
                      ))
                  ) : (
                    <p lang="en" dir="ltr">
                      No care instructions have been shared yet.
                    </p>
                  )}
                  {read(
                    turns
                      .filter((t) => t.language === language)
                      .map(
                        (t) =>
                          t.translation?.backTranslation ??
                          t.response?.patientText,
                      )
                      .join(". "),
                    meta.speech,
                    turns.filter(t => t.language === language).every(t => t.speechKind === "public") ? "public" : "dynamic",
                  )}
                </div>
                <p className={s.notice}>
                  Only shared messages are included. Medications, instructions,
                  and decisions must come from the clinician.
                </p>
              </section>
              <section className={`${s.sheet} ${s.clinical}`}>
                <h2>Clinician summary</h2>
                {summaryPrefs.flagsFirst ? flagsBlock : null}
                <dl>
                  <dt>Chief complaint · latest report</dt>
                  <dd>
                    {latestPatient?.translation?.summary.chiefComplaint ??
                      "Not stated"}
                  </dd>
                  <dt>Symptoms reported across the conversation</dt>
                  <dd>{symptomList.join(", ") || "Not stated"}</dd>
                  <dt>Duration · latest report</dt>
                  <dd>
                    {latestPatient?.translation?.summary.duration ??
                      "Not stated"}
                  </dd>
                </dl>
                {allSpots.length ? (
                  <div>
                    <h3>Where it hurts · every spot the patient marked</h3>
                    <BodyMap
                      figure={bodyFigure}
                      spots={allSpots}
                      className="mt-2 w-full max-w-sm"
                    />
                    <p>
                      {spotLabels(allSpots)}
                    </p>
                  </div>
                ) : null}
                {summaryPrefs.flagsFirst ? null : flagsBlock}
                <details open={summaryPrefs.detail === "full"}>
                  <summary style={{ cursor: "pointer", minHeight: 44, fontWeight: 700, padding: "10px 0" }}>Original & read-back</summary>
                {turns
                  .filter((t) => t.translation)
                  .map((t) => (
                    <div key={t.id}>
                      <p
                        lang={t.language}
                        dir={t.language === "ar" ? "rtl" : "ltr"}
                      >
                        {t.original}
                      </p>
                      <p>{t.translation!.translated}</p>
                      {t.translation!.lowConfidence.map((c, i) => (
                        <p key={i}>Check meaning: {c.reason}</p>
                      ))}
                    </div>
                  ))}
                </details>
                {/* Untranslated words are the only record of what the patient said: never collapsed, whatever the setting. */}
                {turns
                  .filter((t) => t.role === "patient" && !t.translation)
                  .map((t) => (
                    <div key={t.id}>
                      <h3>Translation unavailable · patient’s words</h3>
                      <p
                        lang={t.language}
                        dir={t.language === "ar" ? "rtl" : "ltr"}
                      >
                        {t.original}
                      </p>
                    </div>
                  ))}
                <h3>Clinical decisions</h3>
                <p>
                  No vitals, assessment, diagnosis, medication, or orders are
                  generated. Record those in your clinical workflow.
                </p>
              </section>
            </div>
            <div className={s.actions} style={{ marginTop: 24 }}>
              {
                <Action
                  label={"Copy communication summary"}
                  onClick={copySummary}
                />
              }
              {
                <Action
                  label={"Reply to patient"}
                  onClick={() => {
                    setStage("conversation");
                    changeContext(language, "clinician");
                  }}
                />
              }
            </div>
            <div className="sf-clinician-actions" style={{ marginTop: 20 }}>
              <Action
                label="Ask the patient for more details"
                onClick={() => {
                  setPatientReport(NO_REPORT);
                  setReadyForReply(false);
                  setStage("patient-ready");
                }}
              />
              <Action
                label="Change language or mode"
                onClick={() => setStage("setup")}
              />
            </div>
            <p role="status">{copied}</p>
          </>
        ) : null}
        {stage === "teachback" && lastReply ? (
          <section
            className={s.sheet}
            lang={lastReply.unavailable ? "en" : lastReply.language}
            dir={
              !lastReply.unavailable && lastReply.language === "ar"
                ? "rtl"
                : "ltr"
            }
          >
            <h1>{lastReply.response!.patientText}</h1>
            {lastReply.unavailable ? (
              <p>
                No translated reply is available. Ask a qualified interpreter to
                help communicate the clinician’s original message.
              </p>
            ) : null}
            {lastReply.unavailable ? (
              <Action
                label="Back to clinician"
                onClick={() => {
                  setRole("clinician");
                  setStage("conversation");
                }}
              />
            ) : (
              <>
                <p style={{ marginBlock: 24 }}>{lastReply.response!.teachBackPrompt}</p>
                {read(
                  lastReply.response!.readAloudText,
                  PATIENT_LANGUAGES.find((l) => l.code === lastReply.language)!.speech,
                )}
                <div className={s.choices}>
                  {(["yes", "no", "unsure"] as const).map((answer) => (
                    <button
                      type="button"
                      key={answer}
                      onClick={() => {
                        if (answer === "yes") metrics.current.teachback();
                        setTurns((t) =>
                          t.map((turn) =>
                            turn.id === lastReply.id
                              ? { ...turn, understood: answer }
                              : turn,
                          ),
                        );
                        setRole("patient");
                        setStage("handoff");
                      }}
                    >
                      {COPY[lastReply.language][answer]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : null}
      </main>
      {help ? (
        <aside className={s.alert} role="status">
          <h2>Ask a qualified interpreter</h2>
          <p>
            Contact your clinic’s interpreter service or a staff member. Synapse
            does not place calls or notify anyone.
          </p>
          {<Action label={"Close guidance"} onClick={() => setHelp(false)} />}
        </aside>
      ) : null}
      {idle.warningLeft !== null ? (
        <aside className={s.alert} role="alert" lang={language} dir={meta.dir}>
          <h2>{text.stillThere}</h2>
          <p>{text.clearsIn(idle.warningLeft)}</p>
          {<Action label={text.keepSession} onClick={idle.keepAlive} />}
        </aside>
      ) : null}
      {(stage === "conversation" || stage === "summary") &&
      isClinicianRole(role) ? (
        <footer key={stage} className={s.footer}>
          <div className={s.footerInner}>
            <p>
              <Shield size={16} /> No patient data stored. Communication aid,
              not a diagnostic tool or certified interpreter.
            </p>
            <div className={s.actions}>
              {stage === "conversation" ? (
                <>
                  {<Action label={copy.help} onClick={() => setHelp(!help)} />}
                  {
                    <Action
                      label={"Review summary"}
                      onClick={() => {
                        speech.stop();
                        stopVoice();
                        window.speechSynthesis?.cancel();
                        setStage("summary");
                      }}
                      primary={true}
                      disabled={
                        !turns.some((t) => t.role === "patient") ||
                        busy ||
                        !!pending
                      }
                    />
                  }
                </>
              ) : (
                <>
                  {
                    <Action
                      label={"Back to conversation"}
                      onClick={() => setStage("conversation")}
                    />
                  }
                  {stage === "summary" && !lastReply ? (
                    <Action
                      label="Reply to patient"
                      primary
                      onClick={() => {
                        setStage("conversation");
                        changeContext(language, "clinician");
                      }}
                    />
                  ) : null}
                  {stage === "summary" && lastReply ? (
                    <Action
                      label={"Pass to patient · teach-back"}
                      onClick={() => {
                        setReadyForReply(true);
                        setStage("patient-ready");
                        stopVoice();
                        window.speechSynthesis?.cancel();
                      }}
                      primary={true}
                      disabled={!lastReply}
                    />
                  ) : null}
                  {
                    <Action
                      label={"End session"}
                      onClick={() => {
                        setEnding(true);
                        setClearConfirm(true);
                        window.scrollTo({ top: 0 });
                      }}
                    />
                  }
                </>
              )}
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
