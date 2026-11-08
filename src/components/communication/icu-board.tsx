"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SynapseWordmark } from "@/components/brand/synapse-logo";
import {
  Check,
  PictoHelp,
  PictoNo,
  PictoPain,
  PictoYes,
  Speaker,
  Handoff,
  Shield,
} from "@/components/home/icons";
import {
  cancelGazeRequest,
  getGazeError,
  getGazePhase,
  getGazeRequested,
  getGazeSkipped,
  reopenGaze,
  requestGazeStart,
  setGazeAvailable,
  skipGaze,
  stopGaze,
  subscribeGaze,
} from "@/components/input/gaze/gaze-availability";
import { useIdle } from "@/components/session/use-idle";
import type { SelectEvent } from "@/lib/contracts/input";
import "./workspace.css";
import { workspaceStyles as s } from "./styles";
import "./icu.css";
import "./flow.css";
import { icuStyles as i } from "./styles";

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
  const [selected, setSelected] = useState<string | null>(null);
  const [contrast, setContrast] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  useEffect(
    () => () => {
      setSelected(null);
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
  const idle = useIdle({
    enabled: !expired,
    idleMs: 270000,
    graceMs: 30000,
    onExpire: () => {
      setSelected(null);
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
        <div className={s.headerInner}>
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
          <p>The selected phrase was removed after five minutes of inactivity.</p>
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
        <main ref={main} tabIndex={-1} className={s.main}>
          <section className={s.sheet}>
            <h1>What the patient chose</h1>
            <p className="sf-icu-review-choice" role="status">
              {selected
                ? OPTIONS.find((o) => o.id === selected)?.label
                : "No choice was made"}
            </p>
            <p>
              This is the patient’s selected phrase. No request has been sent to staff.
            </p>
            <div className="sf-clinician-actions">
              <button
                type="button"
                className={s.primary}
                onClick={() => setReviewed(false)}
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
        <main ref={main} tabIndex={-1} className={`${s.main} sf-icu-patient`}>
          {boardUp && !gazeSkipped && (count !== null || !gazeRequested || gazePhase === "off" || gazePhase === "starting") ? (
            <div className="sf-icu-gate" role="dialog" aria-modal="true" aria-labelledby="icu-gate-title">
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
                  <button type="button" className="sf-icu-gate-quiet" onClick={skipGaze}>Use touch or keyboard instead</button>
                  <Link href="/start" className="sf-icu-gate-quiet">Back to setup</Link>
                </>
              )}
            </div>
          ) : null}
          <div className={s.intro}>
            <div>
              <h1>Let your eyes do the talking.</h1>
              <p>One clear choice at a time, with room to rest.</p>
            </div>
            <span className={s.badge}>
              {gazePhase === "on" ? "Eye control on" : "Eye control off"}
            </span>
            {gazeSkipped && gazePhase !== "on" ? (
              <button type="button" className={s.quiet} onClick={reopenGaze}>
                Set up eye control
              </button>
            ) : null}
          </div>
          <div className={i.layout}>
            <section className={s.panel} aria-labelledby="icu-prompt">
              <div className={s.panelHead}>
                <div>
                  <h2 id="icu-prompt">What would you like to say?</h2>
                  <p>After calibration, look at a choice for two seconds to select it. Tap and keyboard also work.</p>
                </div>
              </div>
              <div className="sf-icu-status" role="status" aria-live="polite">
                {selected ? (
                  <>
                    You chose:{" "}
                    <strong>
                      {OPTIONS.find((o) => o.id === selected)?.label}
                    </strong>
                  </>
                ) : (
                  "Choose what you want to say."
                )}
              </div>
              <div className={i.board}>
                {OPTIONS.map(({ id, label, hint, Icon }) => (
                  <button
                    type="button"
                    key={id}
                    className={i.target}
                    data-gaze-target={id}
                    aria-pressed={selected === id}
                    onClick={(event) => {
                      setSelected(id);
                      const channel = (event.nativeEvent as MouseEvent & { synapseInputChannel?: string }).synapseInputChannel === "gaze" ? "gaze" : "tap";
                      onSelect?.({ channel, optionId: id });
                    }}
                  >
                    <Icon size={36} />
                    <strong>{label}</strong>
                    <span>{hint}</span>
                    {selected === id ? (
                      <span className={i.chosen}>
                        <Check size={18} /> Selected
                      </span>
                    ) : (
                      <span className={i.track} aria-hidden="true">
                        <span />
                      </span>
                    )}
                  </button>
                ))}
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
                onClick={() => setSelected(null)}
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
        <footer className={s.footer}>
          <div className={s.footerInner}>
            <p>
              Camera processing stays on this device. Selections are kept only for this conversation.
            </p>
            <button
              type="button"
              className={s.primary}
              onClick={() => setHandoff(true)}
            >
              Pass to clinician
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
