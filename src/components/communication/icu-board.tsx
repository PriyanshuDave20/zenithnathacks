"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  return (
    <div className={`${s.root} ${contrast ? s.high : ""}`}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/start" aria-label="Back to communication workspace">
            <SynapseWordmark accent="#77a0c4" />
          </Link>
          <span className={s.holder}>Eye mode</span>
          <div className={s.headerActions}>
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
      {handoff ? (
        <main className={s.handoff}>
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
        <main className={s.main}>
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
        <main className={`${s.main} sf-icu-patient`}>
          <div className={s.intro}>
            <div>
              <h1>Let your eyes do the talking.</h1>
              <p>One clear choice at a time, with room to rest.</p>
            </div>
            <span className={s.badge}>
              Eye control available · Camera opt-in
            </span>
          </div>
          <div className={i.layout}>
            <section className={s.panel} aria-labelledby="icu-prompt">
              <div className={s.panelHead}>
                <div>
                  <h2 id="icu-prompt">What would you like to say?</h2>
                  <p>Turn on the eye control at the screen edge, calibrate, then look at a choice for two seconds. Tap and keyboard also work.</p>
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
                Use the eye button at the screen edge to enable the camera and complete the nine-point calibration. Keep the device and head steady; recalibrate after moving either.
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
      {!handoff && !reviewed ? (
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
