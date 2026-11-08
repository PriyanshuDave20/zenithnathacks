// Adapted from Akash's synapse-motion.zip: VoiceBars and EkgLoader.
// Scoped styles, inherited colors, and CSS media queries preserve accessibility.
import "./workspace.css";
import { workspaceStyles as s } from "./styles";

export function VoiceBars({ active }: { active: boolean }) {
  return (
    <span className={s.voiceBars} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <i
          key={i}
          style={{
            animationDelay: `${i * 120}ms`,
            animationPlayState: active ? "running" : "paused",
          }}
        />
      ))}
    </span>
  );
}

export function EkgLoader({ label }: { label: string }) {
  const path = "M0 20H58l6-7 6 7h6l7-17 8 34 7-17h8l5-5 5 5H200";
  return (
    <span role="status" className={s.loading}>
      <svg
        viewBox="0 0 200 40"
        width="80"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} pathLength={1} opacity=".3" />
        <path d={path} pathLength={1} className={s.ekg} />
      </svg>
      {label}
    </span>
  );
}
