"use client";

import { useState } from "react";
import { describeAnswers, describeRows } from "@/lib/eye/flow";
import { eye, useEyeState } from "@/lib/eye/session";

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * The clinician's window onto the patient's screen. The patient is in Conversation mode looking at their own
 * board; the doctor can still read the intake (and what the device has said) without taking the device.
 *
 * Everything is inside data-gaze-ignore: these are the clinician's controls, so a stare from the patient can never
 * press them (the gaze layer treats every other button on the page as pressable). Inline styles, like the other
 * critical Eye mode controls, so a stale dev stylesheet cannot break them.
 */
export function ClinicianBar() {
  const { mode, screen, answers, intake, lastIntake, log, muted } = useEyeState();
  const [open, setOpen] = useState(false);
  if (!mode) return null;

  const live = mode === "intake" && screen !== "done";
  const shown = live ? answers : (intake ?? answers);
  const line = live
    ? describeAnswers(answers).join(" · ") || "waiting for the first answer"
    : (lastIntake ?? "No intake yet");
  const label = live ? "Intake in progress" : "Intake";
  const rows = describeRows(shown);
  const recent = [...log].reverse().slice(0, 8);

  return (
    <div data-gaze-ignore style={{ position: "relative", flex: "1 1 280px", minWidth: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 48, padding: "8px 16px", borderRadius: 16, border: "1px solid #c9d6e4", background: "#fff", color: "#101e34", textAlign: "left", font: "inherit", cursor: "pointer" }}
      >
        <strong style={{ flexShrink: 0 }}>For the clinician · {label}:</strong>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</span>
        <span style={{ flexShrink: 0, fontWeight: 700 }}>{open ? "Hide" : "Details"}</span>
      </button>
      {open ? (
        <div
          role="region"
          aria-label="Clinician details"
          style={{ position: "absolute", zIndex: 40, top: "calc(100% + 8px)", left: 0, right: 0, padding: 20, borderRadius: 16, background: "#fff", color: "#101e34", boxShadow: "0 18px 40px -12px rgba(16,30,52,.35), 0 0 0 1px #c9d6e4" }}
        >
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{live ? "Intake so far" : "Intake"}</h2>
          {rows.length ? (
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: "10px 0 0" }}>
              {rows.map((r) => (
                <div key={r.label} style={{ display: "contents" }}>
                  <dt style={{ opacity: 0.75 }}>{r.label}</dt>
                  <dd style={{ margin: 0, fontWeight: 700 }}>{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p style={{ margin: "8px 0 0", opacity: 0.8 }}>No intake has been done yet.</p>
          )}
          <h2 style={{ margin: "18px 0 0", fontSize: "1.05rem" }}>Said aloud for the patient</h2>
          {recent.length ? (
            <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {recent.map((entry) => (
                <li key={entry.at + entry.text} style={entry.help ? { color: "var(--alert-deep, #9b1c1c)", fontWeight: 800 } : undefined}>
                  <span style={{ opacity: 0.7 }}>{time(entry.at)}</span> {entry.help ? "HELP · " : ""}
                  {entry.text}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: "8px 0 0", opacity: 0.8 }}>Nothing yet.</p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 18 }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", minHeight: 44 }}>
              <input type="checkbox" checked={!muted} onChange={(event) => eye.setMuted(!event.target.checked)} />
              Speak aloud
            </label>
            <button
              type="button"
              onClick={() => {
                eye.start("intake");
                setOpen(false);
              }}
              style={{ minHeight: 44, padding: "0 18px", borderRadius: 9999, border: "1px solid #c9d6e4", background: "#fff", color: "#101e34", font: "inherit", fontWeight: 700, cursor: "pointer" }}
            >
              {intake ? "Redo intake" : "Start intake"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
