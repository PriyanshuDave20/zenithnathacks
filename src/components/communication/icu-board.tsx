"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SynapseWordmark } from "@/components/brand/synapse-logo";
import {
  Check,
  PictoPain,
  Speaker,
  Handoff,
  Shield,
} from "@/components/home/icons";
import type { SelectEvent } from "@/lib/contracts/input";
import "./workspace.css";
import { workspaceStyles as s } from "./styles";
import "./icu.css";
import { icuStyles as i } from "./styles";

const OPTIONS = [
  { id: "yes", label: "Yes", hint: "That is right", Icon: Check },
  { id: "no", label: "No", hint: "That is not right", Icon: Handoff },
  { id: "pain", label: "Pain", hint: "Something hurts", Icon: PictoPain },
  { id: "help", label: "Help", hint: "I need attention", Icon: Handoff },
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

/** Presentation boundary for future input-channel integration. Manual preview emits tap, never fake gaze events. */
export function IcuBoard({
  onSelect,
}: {
  onSelect?: (event: SelectEvent) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [contrast, setContrast] = useState(false);
  useEffect(() => () => setSelected(null), []);
  return (
    <div className={`${s.root} ${contrast ? s.high : ""}`}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/start" aria-label="Back to communication workspace">
            <SynapseWordmark accent="#77a0c4" />
          </Link>
          <span className={s.holder}>ICU · Eye selection</span>
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
      <main className={s.main}>
        <div className={s.intro}>
          <div>
            <h1>Let your eyes do the talking.</h1>
            <p>One clear choice at a time, with room to rest.</p>
          </div>
          <span className={s.badge}>
            Interface preview · Eye tracking not connected
          </span>
        </div>
        <div className={i.layout}>
          <section className={s.panel} aria-labelledby="icu-prompt">
            <div className={s.panelHead}>
              <div>
                <h2 id="icu-prompt">What would you like to say?</h2>
                <p>Tap or use Tab and Enter to preview a choice.</p>
              </div>
            </div>
            <div className={i.board}>
              {OPTIONS.map(({ id, label, hint, Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={i.target}
                  aria-pressed={selected === id}
                  onClick={() => {
                    setSelected(id);
                    onSelect?.({ channel: "tap", optionId: id });
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
          <aside className={s.sheet}>
            <h2>For the clinician</h2>
            <p>
              Position the screen directly in front of the patient, at a
              comfortable viewing distance.
            </p>
            <h3>Eye control</h3>
            <p>
              Camera access, calibration, gaze detection, and dwell selection
              will be connected by the input-channel team.
            </p>
            <p className={s.notice}>
              This page only previews the interface. Hover or keyboard focus
              shows a dwell indicator; it does not select a target. No camera is
              accessed.
            </p>
            <h3>Patient’s choice</h3>
            <div className={i.preview} role="status" aria-live="polite">
              {selected
                ? OPTIONS.find((o) => o.id === selected)?.label
                : "Waiting for a choice"}
            </div>
            <p>Choices here do not notify staff or trigger clinical actions.</p>
            <button
              type="button"
              className={s.quiet}
              disabled={!selected}
              onClick={() => setSelected(null)}
            >
              Clear preview choice
            </button>
            <p>
              <Speaker size={18} /> Keep spoken reassurance and a human
              communication aid available.
            </p>
          </aside>
        </div>
      </main>
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <p>
            No camera feed, recording, or stored selections. Frontend preview
            only.
          </p>
          <Link href="/start" className={s.primary}>
            Back to conversation
          </Link>
        </div>
      </footer>
    </div>
  );
}
