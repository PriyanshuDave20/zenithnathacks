"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SynapseWordmark } from "@/components/brand/synapse-logo";
import {
  ArrowLeft,
  PictoArm,
  PictoBack,
  PictoChest,
  PictoHead,
  PictoHelp,
  PictoLeg,
  PictoStomach,
  PictoNo,
  PictoPain,
  PictoYes,
  Speaker,
  Handoff,
  Shield,
} from "@/components/home/icons";
import {
  cancelGazeRequest,
  getGazeEdgeWide,
  getGazeError,
  getGazePhase,
  getGazeRequested,
  getGazeSkipped,
  reopenGaze,
  requestGazeStart,
  setGazeEdgeWide,
  setGazeAvailable,
  skipGaze,
  stopGaze,
  subscribeGaze,
} from "@/components/input/gaze/gaze-availability";
import { useIdle } from "@/components/session/use-idle";
import { edgeSafePx } from "@/lib/input/gaze/gaze-math";
import { GATE_CSS } from "./eye-gate-styles";
import type { SelectEvent } from "@/lib/contracts/input";
import "./workspace.css";
import { workspaceStyles as s } from "./styles";
import "./icu.css";
import "./flow.css";
import { idleMsFor, optionFor, SESSION_WARNING_MS, useSessionTimeout } from "@/lib/session-timeout";
import { icuStyles as i } from "./styles";
import {
  clearFrom,
  describeAnswers,
  EMPTY_ANSWERS,
  nextStep,
  previousStep,
  rootLabel,
  SIDE_OPTIONS,
  STRENGTH_OPTIONS,
  WHERE_OPTIONS,
  type FlowAnswers,
  type FlowStep,
} from "./icu-flow";

const WHERE_ICONS: Record<string, (p: { size?: number }) => React.ReactNode> = {
  head: PictoHead,
  chest: PictoChest,
  abdomen: PictoStomach,
  back: PictoBack,
  arm: PictoArm,
  leg: PictoLeg,
};

const STEP_PROMPT: Record<Exclude<FlowStep, "root">, string> = {
  confirm: "Is this what you want to say?",
  where: "Where does it hurt?",
  side: "Which side?",
  strength: "How strong is the pain?",
  review: "Is this right?",
};

/** One big gaze/tap target. The step's container is keyed, so every screen gets fresh elements and a fresh dwell. */
function FlowTile({
  id,
  label,
  hint,
  icon,
  strong,
  onPick,
}: {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  strong?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={i.target}
      data-gaze-target={id}
      onClick={onPick}
      style={{
        minHeight: strong ? 180 : 120,
        padding: strong ? undefined : "14px 20px",
        ...(strong ? { background: "var(--action)", color: "#fff", borderColor: "var(--action)" } : null),
      }}
    >
      {icon}
      <strong style={strong ? { fontSize: "2em" } : undefined}>{label}</strong>
      {hint ? <span>{hint}</span> : null}
      <span className={i.track} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

const OPTIONS = [
  { id: "yes", label: "Yes", hint: "That is right", Icon: PictoYes },
  { id: "no", label: "No", hint: "That is not right", Icon: PictoNo },
  { id: "pain", label: "Pain", hint: "Something hurts", Icon: PictoPain },
  { id: "help", label: "Help", hint: "I need attention", Icon: PictoHelp },
  {
    id: "reposition",
    label: "Move me",
    hint: "Help me get comfortable",
    Icon: Handoff,
  },
  {
    id: "pause",
    label: "Take a break",
    hint: "Pause this conversation",
    Icon: Shield,
  },
];

/** Uses the shared gaze layer; its marked activation preserves the existing SelectEvent contract. */
export function IcuBoard({
  onSelect,
}: {
  onSelect?: (event: SelectEvent) => void;
}) {
  const main = useRef<HTMLElement>(null);
  const [expired, setExpired] = useState(false);
  const [answers, setAnswers] = useState<FlowAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState<FlowStep>("root");
  const selected = answers.option;
  const resetFlow = () => {
    setAnswers(EMPTY_ANSWERS);
    setStep("root");
  };
  const [contrast, setContrast] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  useEffect(
    () => () => {
      setHandoff(false);
      setReviewed(false);
    },
    [],
  );
  // Gaze control exists only while the patient has the board: on the clinician handoff, the review and
  // the cleared screen it is hidden and the camera is off. Arriving at the board starts calibration.
  const gazeRequested = useSyncExternalStore(subscribeGaze, getGazeRequested, () => false);
  const gazePhase = useSyncExternalStore(subscribeGaze, getGazePhase, () => "off" as const);
  const gazeError = useSyncExternalStore(subscribeGaze, getGazeError, () => null);
  const gazeSkipped = useSyncExternalStore(subscribeGaze, getGazeSkipped, () => false);
  const edgeWide = useSyncExternalStore(subscribeGaze, getGazeEdgeWide, () => false);
  // Keep controls clear of the screen edge. In the dark a system effect (macOS Edge Light) can light or cover the
  // border of the whole display, over the page, and the page cannot see it. The margin is published as --eye-edge
  // so the tracking layer's own buttons use the same one.
  useEffect(() => {
    const apply = () => {
      const edge = edgeSafePx(window.innerWidth, window.innerHeight, edgeWide);
      const root = document.documentElement.style;
      root.setProperty("--eye-edge", `${edge}px`);
      // Top and bottom get half by default (full-width margins there would eat a third of a laptop screen);
      // all four sides get the full margin once the clinician says the edge light is on.
      root.setProperty("--eye-edge-v", `${Math.round(edgeWide ? edge : edge / 2)}px`);
      // The floating eye buttons sit this far in from the side; on a wide enough screen the board leaves a gutter for
      // them (button width + a gap) so they never lie on top of a choice.
      root.setProperty("--eye-gutter", window.innerWidth >= 900 ? `${edge + 100}px` : "0px");
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--eye-edge");
      document.documentElement.style.removeProperty("--eye-edge-v");
      document.documentElement.style.removeProperty("--eye-gutter");
    };
  }, [edgeWide]);
  // 3-2-1 after the clinician taps Ready, so the patient can settle before the camera starts.
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (count === null) return;
    const timer = setTimeout(() => {
      if (count <= 1) {
        setCount(null);
        requestGazeStart();
      } else {
        setCount(count - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [count]);
  const boardUp = !expired && !handoff && !reviewed;
  useEffect(() => {
    setGazeAvailable(boardUp);
    return () => setGazeAvailable(false);
  }, [boardUp]);
  // Moves to the screen after `from`; when the chain is finished the device goes to the clinician.
  const advance = (from: FlowStep, next: FlowAnswers) => {
    setAnswers(next);
    const to = nextStep(from, next);
    if (to) setStep(to);
    else setHandoff(true);
  };
  const back = () => {
    setAnswers(clearFrom(step, answers));
    setStep(previousStep(step, answers));
  };
  const sessionTimeout = useSessionTimeout();
  const idle = useIdle({
    enabled: !expired,
    idleMs: idleMsFor(sessionTimeout),
    graceMs: SESSION_WARNING_MS,
    onExpire: () => {
      resetFlow();
      setHandoff(false);
      setReviewed(false);
      setExpired(true);
      window.speechSynthesis?.cancel();
      window.dispatchEvent(new Event("synapse:gaze-stop"));
    },
  });
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [handoff, reviewed, expired]);
  return (
    <div className={`${s.root} ${contrast ? s.high : ""}`}>
      <header className={s.header}>
        <div className={s.headerInner} style={{ paddingInline: "max(24px, var(--eye-edge, 24px))", paddingTop: "max(8px, var(--eye-edge-v, 8px))" }}>
          <Link href="/start" aria-label="Back to communication workspace">
            <SynapseWordmark accent="#77a0c4" />
          </Link>
          <span className={s.holder}>Eye mode</span>
          <div className={s.headerActions}>
            {gazeRequested && !handoff && !reviewed && !expired ? (
              <button type="button" onClick={stopGaze}>
                Stop eye control
              </button>
            ) : null}
            <button
              type="button"
              aria-pressed={contrast}
              onClick={() => setContrast(!contrast)}
            >
              High contrast
            </button>
          </div>
        </div>
      </header>
      {expired ? (
        <main ref={main} tabIndex={-1} className={s.handoff}>
          <h1>Session cleared</h1>
          <p>The selected phrase was removed after {optionFor(sessionTimeout).spoken} of inactivity.</p>
          <button type="button" className="sf-handoff-choice" onClick={() => setExpired(false)}>Start a new conversation</button>
          <Link href="/start" className={s.quiet}>Back to setup</Link>
        </main>
      ) : handoff ? (
        <main ref={main} tabIndex={-1} className={s.handoff}>
          <Handoff size={48} />
          <h1>Pass the device to the clinician</h1>
          <p>The communication board is hidden while you pass the device.</p>
          <button
            type="button"
            className="sf-handoff-choice"
            onClick={() => {
              setHandoff(false);
              setReviewed(true);
            }}
          >
            I’m the clinician
          </button>
          <button
            type="button"
            className={s.quiet}
            onClick={() => setHandoff(false)}
          >
            Back to the board
          </button>
        </main>
      ) : reviewed ? (
        <main ref={main} tabIndex={-1} className={s.main} style={{ paddingInline: "max(24px, var(--eye-edge, 24px))" }}>
          <section className={s.sheet}>
            <h1>What the patient chose</h1>
            <p className="sf-icu-review-choice" role="status">
              {selected ? describeAnswers(answers).join(" · ") : "No choice was made"}
            </p>
            <p>
              This is the patient’s selected phrase. No request has been sent to staff.
            </p>
            <div className="sf-clinician-actions">
              <button
                type="button"
                className={s.primary}
                onClick={() => {
                  // The next thing the patient wants to say starts from the board again.
                  resetFlow();
                  setReviewed(false);
                }}
              >
                Return to patient’s board
              </button>
              <Link href="/start" className={s.quiet}>
                Finish Eye mode
              </Link>
            </div>
          </section>
        </main>
      ) : (
        <main ref={main} tabIndex={-1} className={`${s.main} sf-icu-patient`} style={{ paddingInline: "max(24px, var(--eye-edge, 24px))" }}>
          {boardUp && !gazeSkipped && (count !== null || !gazeRequested || gazePhase === "off" || gazePhase === "starting") ? (
            <div className="sf-icu-gate" role="dialog" aria-modal="true" aria-labelledby="icu-gate-title">
              <style>{GATE_CSS}</style>
              {count !== null ? (
                <>
                  <h2 id="icu-gate-title" className="sf-icu-gate-label">Get ready: look at the screen</h2>
                  <p key={count} className="sf-icu-gate-count" role="timer" aria-live="assertive">{count}</p>
                  <button type="button" className="sf-icu-gate-quiet" onClick={() => setCount(null)}>Cancel</button>
                </>
              ) : gazeRequested ? (
                <>
                  <h2 id="icu-gate-title" className="sf-icu-gate-label">Starting the camera…</h2>
                  <p className="sf-icu-gate-note">Allow camera access if your browser asks. Calibration begins next: the patient follows the dot for 30 seconds.</p>
                  <button type="button" className="sf-icu-gate-quiet" onClick={cancelGazeRequest}>Cancel</button>
                </>
              ) : (
                <>
                  <h2 id="icu-gate-title" className="sf-icu-gate-label">Eye control setup</h2>
                  <p className="sf-icu-gate-note">Clinician: tap when the patient is in position and you are both looking at the screen. A 3-2-1 countdown, then calibration, then eye control turns on.</p>
                  {gazeError ? <p className="sf-icu-gate-error" role="alert">{gazeError}</p> : null}
                  <button type="button" className="sf-icu-gate-btn" autoFocus onClick={() => setCount(3)}>
                    {gazeError ? "Try again" : "Ready"}
                  </button>
                  <label className="sf-icu-gate-edge">
                    <input type="checkbox" checked={edgeWide} onChange={(event) => setGazeEdgeWide(event.target.checked)} />
                    <span>My screen lights up around the edges in the dark (Mac Edge Light). Keep buttons further in.</span>
                  </label>
                  <div className="sf-icu-gate-row">
                    <button type="button" className="sf-icu-gate-quiet" onClick={skipGaze}>Use touch or keyboard instead</button>
                    <Link href="/start" className="sf-icu-gate-quiet">Back to setup</Link>
                  </div>
                </>
              )}
            </div>
          ) : null}
          <div className={s.intro}>
            {/* Once the questions start, the page title makes room so the choices fit without scrolling. */}
            {step === "root" ? (
              <div>
                <h1>Let your eyes do the talking.</h1>
                <p>One clear choice at a time, with room to rest.</p>
              </div>
            ) : (
              <h1 className="sr-only">Eye mode questions</h1>
            )}
            <span className={s.badge}>
              {gazePhase === "on" ? "Eye control on" : "Eye control off"}
            </span>
            {gazeSkipped && gazePhase !== "on" ? (
              <button type="button" className={s.quiet} onClick={reopenGaze}>
                Set up eye control
              </button>
            ) : null}
          </div>
          <div className={i.layout} style={{ maxWidth: "min(1050px, calc(100vw - 2 * var(--eye-gutter, 0px)))" }}>
            <section className={s.panel} aria-labelledby="icu-prompt">
              <div className={s.panelHead}>
                <div>
                  <h2 id="icu-prompt">{step === "root" ? "What would you like to say?" : STEP_PROMPT[step]}</h2>
                  <p>
                    {step === "root"
                      ? "After calibration, look at a choice for two seconds to select it. Tap and keyboard also work."
                      : "Look at a choice for two seconds to select it. Tap and keyboard also work."}
                  </p>
                </div>
                {step !== "root" && step !== "confirm" && step !== "review" ? (
                  // Always on screen, at the top of the question: Back is a normal big target like any choice.
                  <button
                    type="button"
                    className={s.quiet}
                    data-gaze-target="flow-back"
                    onClick={back}
                    style={{ minHeight: 64, minWidth: "9rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: "1.1rem" }}
                  >
                    <ArrowLeft size={22} /> Go back
                  </button>
                ) : null}
              </div>
              <div className="sf-icu-status" role="status" aria-live="polite">
                {step === "root" ? (
                  "Choose what you want to say."
                ) : (
                  <>
                    {step === "review" || step === "confirm" ? "You chose: " : "So far: "}
                    <strong>{describeAnswers(answers).join(" · ")}</strong>
                  </>
                )}
              </div>
              <div
                key={step}
                className={i.board}
                style={
                  step === "where" || step === "side"
                    ? { gridTemplateColumns: "repeat(3, 1fr)" }
                    : step === "confirm" || step === "strength" || step === "review"
                      ? { gridTemplateColumns: "repeat(2, 1fr)" }
                      : undefined
                }
              >
                {step === "root"
                  ? OPTIONS.map(({ id, label, hint, Icon }) => (
                      <button
                        type="button"
                        key={id}
                        className={i.target}
                        data-gaze-target={id}
                        aria-pressed={selected === id}
                        onClick={(event) => {
                          const channel = (event.nativeEvent as MouseEvent & { synapseInputChannel?: string }).synapseInputChannel === "gaze" ? "gaze" : "tap";
                          onSelect?.({ channel, optionId: id });
                          setAnswers({ ...EMPTY_ANSWERS, option: id });
                          setStep("confirm");
                        }}
                      >
                        <Icon size={36} />
                        <strong>{label}</strong>
                        <span>{hint}</span>
                        <span className={i.track} aria-hidden="true">
                          <span />
                        </span>
                      </button>
                    ))
                  : null}
                {step === "confirm" ? (
                  <>
                    <FlowTile id="confirm-yes" strong label="Yes, that’s right" hint={`${rootLabel(answers.option) ?? ""}`} onPick={() => advance("confirm", answers)} />
                    <FlowTile id="confirm-no" strong={false} label="No, go back" hint="Choose again" onPick={resetFlow} />
                  </>
                ) : null}
                {step === "where"
                  ? WHERE_OPTIONS.map((o) => {
                      const Picto = WHERE_ICONS[o.picto];
                      return (
                        <FlowTile
                          key={o.id}
                          id={`where-${o.id}`}
                          label={o.label}
                          icon={<Picto size={44} />}
                          onPick={() => advance("where", { ...answers, where: o.id })}
                        />
                      );
                    })
                  : null}
                {step === "side"
                  ? SIDE_OPTIONS.map((o) => (
                      <FlowTile key={o.id} id={`side-${o.id}`} label={o.label} hint={o.hint} onPick={() => advance("side", { ...answers, side: o.id })} />
                    ))
                  : null}
                {step === "strength"
                  ? STRENGTH_OPTIONS.map((o) => (
                      <FlowTile key={o.id} id={`strength-${o.id}`} label={o.label} hint={o.hint} onPick={() => advance("strength", { ...answers, strength: o.id })} />
                    ))
                  : null}
                {step === "review" ? (
                  <>
                    <FlowTile id="review-yes" strong label="Yes, send it to the clinician" hint={describeAnswers(answers).join(" · ")} onPick={() => advance("review", answers)} />
                    <FlowTile
                      id="review-change"
                      label="No, change it"
                      hint="Start the questions again"
                      onPick={() => {
                        setAnswers(clearFrom("where", answers));
                        setStep("where");
                      }}
                    />
                  </>
                ) : null}
              </div>
            </section>
            <details className={`${s.sheet} sf-icu-guide`}>
              <summary>Clinician guidance & preview controls</summary>
              <p>
                Position the screen directly in front of the patient, at a
                comfortable viewing distance.
              </p>
              <h3>Eye control</h3>
              <p>
                Tap Start eye calibration when you and the patient are both looking at the screen; the patient then follows the 30-second moving dot. Keep the device and head steady; recalibrate after moving either.
              </p>
              <p className={s.notice}>
                A ring around the gaze cursor fills while looking at a choice. A completed two-second dwell selects it. Camera frames are processed on this device; tracking can be turned off using the eye button.
              </p>
              <p>
                Choices here do not notify staff or trigger clinical actions.
              </p>
              <button
                type="button"
                className={s.quiet}
                disabled={!selected}
                onClick={resetFlow}
              >
                Clear choice
              </button>
              <p>
                <Speaker size={18} /> Keep spoken reassurance and a human
                communication aid available.
              </p>
            </details>
          </div>
        </main>
      )}
      {idle.warningLeft !== null ? (
        <aside className={s.alert} role="alert">
          <h2>Still there?</h2>
          <p>To protect privacy, this session clears in {idle.warningLeft}s.</p>
          <button type="button" className={s.primary} onClick={idle.keepAlive}>Keep session</button>
        </aside>
      ) : null}
      {!expired && !handoff && !reviewed ? (
        <footer className={s.footer} style={{ paddingBottom: "max(16px, var(--eye-edge-v, 16px))", paddingInline: "max(24px, var(--eye-edge, 24px))" }}>
          <div className={s.footerInner}>
            <p>
              Camera processing stays on this device. Selections are kept only for this conversation.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", flexShrink: 0, maxWidth: "100%", gap: 12, alignItems: "stretch", justifyContent: "flex-end" }}>
              {gazePhase === "on" ? (
                // Big, always on screen, and a normal button: the person can dwell on it with their eyes like
                // any choice, or the clinician can tap it. Inline styles so a stale dev stylesheet cannot shrink it.
                <button
                  type="button"
                  data-gaze-target="stop-eye-control"
                  aria-label="Stop eye control. Look here for two seconds, or tap."
                  onClick={stopGaze}
                  style={{
                    minHeight: 72,
                    minWidth: "18rem",
                    maxWidth: "100%",
                    padding: "0 32px",
                    borderRadius: 9999,
                    background: "#101e34",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    boxShadow: "0 0 0 3px #fff, 0 0 0 5px #101e34",
                  }}
                >
                  Stop eye control
                  <span style={{ display: "block", marginTop: 4, fontSize: 13, fontWeight: 500, opacity: 0.8 }}>
                    Look here for 2 seconds, or tap
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                className={s.primary}
                onClick={() => setHandoff(true)}
              >
                Pass to clinician
              </button>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
