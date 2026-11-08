"use client";

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
import { spotLabels, spotParts, spotsToInputs, type BodySpot } from "@/lib/input/body-parts";
import {
  PATIENT_LANGUAGES,
  QUESTIONS,
  PHRASES,
  CLINICIAN_REPLIES,
  TEACH_BACK,
  mockCanTranslateReply,
  type Mode,
  type PatientLanguage,
  type TranslateInput,
  type TranslateResponse,
  type RespondResponse,
} from "@/lib/mocks";
import { translate, respond } from "@/components/session/api";
import { STRINGS } from "@/components/session/strings";
import { useRecognition, useSpeak } from "@/components/session/use-speech";
import { useIdle } from "@/components/session/use-idle";
import { byEnglishName } from "./language-search";
import "./workspace.css";
import { workspaceStyles as s } from "./styles";
import { EkgLoader, VoiceBars } from "./motion";
import { SessionSetup, type SetupMode } from "./session-setup";
import {
  IntakeFree,
  IntakeGuided,
  ConfirmReadBack,
} from "@/components/session/patient-screens";
import "./flow.css";

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
  const [setupMode, setSetupMode] = useState<SetupMode>("standard");
  const [patientPath, setPatientPath] = useState<"free" | "guided">("free");
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
  const [audio, setAudio] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [help, setHelp] = useState(false);
  const [sound, setSound] = useState(false);
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState<"voice" | "pictures" | "type">(
    "voice",
  );
  const [selected, setSelected] = useState<TranslateInput[]>([]);
  const [bodySpots, setBodySpots] = useState<BodySpot[]>([]);
  const [body, setBody] = useState(false);
  const [copied, setCopied] = useState("");
  const version = useRef(0);
  const lock = useRef(false);
  const nextId = useRef(1);
  const main = useRef<HTMLElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const meta = PATIENT_LANGUAGES.find((l) => l.code === language)!;
  const text = STRINGS[language];
  const copy = COPY[language];
  const speech = useRecognition(role === "patient" ? meta.speech : "en-US");
  const voice = useSpeak();
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
    version.current++;
    lock.current = false;
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
  }, [setFinalText]);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [stage]);
  useEffect(() => {
    stream.current?.scrollTo({ top: stream.current.scrollHeight });
  }, [turns.length, pending]);
  const idle = useIdle({
    enabled:
      stage !== "end" &&
      (stage !== "setup" ||
        turns.length > 0 ||
        patientInputs.length > 0 ||
        !!draft),
    idleMs: 270000,
    graceMs: 30000,
    onExpire: () => clear(true),
  });

  function changeContext(nextLanguage: PatientLanguage, nextRole = role) {
    if (busy || pending) return;
    speech.stop();
    speech.setFinalText("");
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
        const painLabel = {
          en: "Pain intensity",
          es: "Intensidad del dolor",
          ar: "شدة الألم",
          "zh-Hans": "疼痛程度",
        }[language];
        const inputs: TranslateInput[] = [
          ...(severity !== null
            ? [{ kind: "text" as const, value: `${painLabel}: ${severity}/10` }]
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
            unavailable: !mockCanTranslateReply(message, language),
          },
        ]);
        if (audio && canAudio)
          voice.speak(
            response.readAloudText,
            mockCanTranslateReply(message, language) ? meta.speech : "en-US",
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
    setTurns((current) => [...current, pending]);
    setStage("handoff");
    setPending(null);
    setDraft("");
    speech.setFinalText("");
    setSelected([]);
    setBodySpots([]);
    setSeverity(null);
    if (audio && canAudio)
      voice.speak(pending.translation!.backTranslation, meta.speech);
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
    setTurns((current) => [
      ...current,
      {
        id: nextId.current++,
        role: "patient",
        language,
        original: patientInputs.map((i) => i.value).join(" · "),
        unavailable: true,
        spots: patientReport.spots,
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
  // Every spot from every patient report, so overlapping reports read as one heat map.
  const allSpots = useMemo(() => turns.flatMap((t) => t.spots ?? []), [turns]);
  const bodyParts = spotParts(bodySpots);
  async function copySummary() {
    const content = turns
      .map((t) =>
        t.translation
          ? `Patient report (demo): ${t.translation.translated}\nOriginal: ${t.original}\nBack-translation: ${t.translation.backTranslation}`
          : t.role === "patient"
            ? `Patient report (untranslated): ${t.original}`
            : `Clinician: ${t.original}\nTeach-back: ${t.understood ?? "Not checked"}`,
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(content);
      setCopied("Copied. Review before adding to any record.");
    } catch {
      setCopied("Copy unavailable. Select the text to copy it manually.");
    }
  }

  const read = (value: string, lang = meta.speech) =>
    canAudio && voice.supported ? (
      <button type="button" onClick={() => voice.speak(value, lang)}>
        <Speaker size={18} /> {text.readAloud}
      </button>
    ) : null;

  return (
    <div
      className={`${s.root} ${highContrast ? s.high : ""} ${mode === "deaf_hoh" ? s.caption : ""}`}
      style={{ "--scale": scale } as CSSProperties}
    >
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" aria-label="Synapse home">
            <SynapseWordmark accent="#77a0c4" />
          </Link>
          <span className={s.holder} aria-live="polite">
            {holder} has the device
          </span>
          <div className={s.headerActions}>
            {clearConfirm ? (
              <>
                {
                  <Action
                    label={"Cancel"}
                    onClick={() => setClearConfirm(false)}
                  />
                }
                {<Action label={"Clear now"} onClick={() => clear(ending)} />}
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
                {canAudio ? (
                  <button
                    type="button"
                    aria-pressed={audio}
                    onClick={() => {
                      setAudio(!audio);
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
        {stage === "setup" ? (
          <SessionSetup
            language={language}
            mode={setupMode}
            path={patientPath}
            onLanguage={setLanguage}
            onMode={(next) => {
              setSetupMode(next);
              if (next !== "icu") {
                setMode(next);
                setPatientPath(next === "standard" ? "free" : "guided");
              }
            }}
            onPath={setPatientPath}
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
              alt="Synapse"
              width={640}
              height={400}
            />
            <Handoff size={48} />
            <h1>Pass the device to the patient</h1>
            <p>
              {setupMode === "icu"
                ? "The eye-selection interface is ready to preview. Eye tracking is not connected."
                : readyForReply
                  ? `Your reply is ready in ${meta.english}.`
                  : `${meta.english} · ${MODES.find((m) => m.id === mode)?.label}. The patient will see one clear task at a time.`}
            </p>
            {setupMode === "icu" ? (
              <Link className="sf-handoff-choice" href="/icu">
                Open patient’s ICU board
              </Link>
            ) : (
              <button
                type="button"
                className="sf-handoff-choice"
                lang={language}
                dir={meta.dir}
                onClick={() => {
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
              <IntakeGuided lang={lang} mode={mode} onSubmit={submitPatient} />
            ) : (
              <IntakeFree
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
              failed={!!error && !busy}
              fallbackText={patientInputs.map((i) => i.value).join(" · ")}
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
              alt="Synapse"
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
              alt="Synapse"
              width={640}
              height={400}
            />
            <Handoff size={48} />
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
                              ? "keyword summary, not a full translation."
                              : "translation unavailable; shown in English."}
                          </p>
                        ) : null}
                        {t.spots?.length ? (
                          <BodyMap
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
                          aria-label="Input method"
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
                        {channel === "pictures" ? (
                          <>
                            <h3>{QUESTIONS[0].text[language]}</h3>
                            <div className={s.tiles}>
                              {QUESTIONS[0].options.map((o) => (
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
                              <h3 className={s.question}>
                                {
                                  {
                                    en: "Pain: 0 is none, 10 is the worst",
                                    es: "Dolor: 0 es nada, 10 es el peor",
                                    ar: "الألم: ٠ لا ألم، ١٠ أسوأ ألم",
                                    "zh-Hans": "疼痛：0为不痛，10为最痛",
                                  }[language]
                                }
                              </h3>
                              <div
                                className={s.choices}
                                role="group"
                                aria-label="Pain intensity"
                              >
                                {Array.from({ length: 11 }, (_, n) => (
                                  <button
                                    type="button"
                                    key={n}
                                    aria-pressed={severity === n}
                                    disabled={busy}
                                    onClick={() =>
                                      setSeverity(severity === n ? null : n)
                                    }
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {[QUESTIONS[1], QUESTIONS[4]].map((q) => (
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
                                onClick={() => {
                                  setDraft((d) =>
                                    [d, p.text[language]]
                                      .filter(Boolean)
                                      .join(" "),
                                  );
                                  if (mode === "mute" && audio)
                                    voice.speak(p.text[language], meta.speech);
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
                            {CLINICIAN_REPLIES.map((r) => (
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
                            Suggested replies have demo translations. Other
                            replies are shown in English.
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
                  )}
                </div>
                <p className={s.notice}>
                  Only shared messages are included. Medications, instructions,
                  and decisions must come from the clinician.
                </p>
              </section>
              <section className={`${s.sheet} ${s.clinical}`}>
                <h2>Clinician summary</h2>
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
                      spots={allSpots}
                      className="mt-2 w-full max-w-sm"
                    />
                    <p>
                      {spotLabels(allSpots)}
                    </p>
                  </div>
                ) : null}
                {flags.length ? (
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
                ) : null}
                <h3>Original & read-back</h3>
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
                Translation unavailable. This reply is in English; request an
                interpreter if needed.
              </p>
            ) : null}
            <p style={{ marginBlock: 24 }}>{TEACH_BACK[lastReply.language]}</p>
            {read(
              lastReply.response!.readAloudText,
              lastReply.unavailable
                ? "en-US"
                : PATIENT_LANGUAGES.find((l) => l.code === lastReply.language)!
                    .speech,
            )}
            <div className={s.choices}>
              {(["yes", "no", "unsure"] as const).map((answer) => (
                <button
                  type="button"
                  key={answer}
                  onClick={() => {
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
        <footer className={s.footer}>
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
