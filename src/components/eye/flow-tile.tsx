"use client";

import type { MouseEvent, ReactNode } from "react";
import { icuStyles as i } from "@/components/communication/styles";

/**
 * One big target for gaze or tap. Every screen renders its tiles inside a keyed container, so each screen gets
 * fresh elements and a fresh dwell: a stare that ended one screen cannot carry over to the next.
 */
export function FlowTile({
  id,
  label,
  hint,
  icon,
  tone = "default",
  minHeight,
  onPick,
}: {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "strong" | "help";
  minHeight?: number;
  onPick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const colours =
    tone === "strong"
      ? { background: "var(--action)", color: "#fff", borderColor: "var(--action)" }
      : tone === "help"
        ? { background: "var(--alert-deep, #9b1c1c)", color: "#fff", borderColor: "var(--alert-deep, #9b1c1c)" }
        : null;
  return (
    <button
      type="button"
      className={i.target}
      data-gaze-target={id}
      onClick={onPick}
      style={{ minHeight: minHeight ?? (tone === "default" ? 120 : 180), padding: tone === "default" ? "14px 20px" : undefined, ...colours }}
    >
      {icon}
      <strong style={tone === "default" ? undefined : { fontSize: "2em" }}>{label}</strong>
      {hint ? <span>{hint}</span> : null}
      <span className={i.track} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
