import type { ReactNode } from "react";

/** The product carrier: a real 3D phone with the live screen on its glass (see phone-3d.tsx). */
export { Phone3D as Phone } from "./phone-3d";

/** App bar inside the phone: who is holding the device right now. */
export function ScreenBar({ holder, step }: { holder: "Clinician" | "Patient"; step?: string }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-line px-5 pb-3 pt-1">
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold ${
          holder === "Clinician" ? "bg-navy text-white" : "bg-blue-soft text-blue-deeper"
        }`}
      >
        {holder}
      </span>
      {step ? <span className="text-sm font-medium text-ink-soft">{step}</span> : null}
    </div>
  );
}

/** A chat bubble with one small tail corner on the speaker's side. */
export function Bubble({
  tone,
  caption,
  children,
  lang,
  dir,
  className = "",
}: {
  tone: "patient" | "readback" | "clinician";
  caption: string;
  children: ReactNode;
  lang?: string;
  dir?: "ltr" | "rtl";
  className?: string;
}) {
  const shape =
    tone === "patient"
      ? "self-start rounded-[1.75rem] rounded-bl-[0.5rem] bg-blue-soft text-ink"
      : tone === "readback"
        ? "self-end rounded-[1.75rem] rounded-br-[0.5rem] bg-ground-2 text-ink"
        : "self-end rounded-[1.75rem] rounded-br-[0.5rem] bg-navy text-white";
  return (
    <div className={`max-w-[88%] px-4 py-3 ${shape} ${className}`}>
      <p className={`text-sm font-medium ${tone === "clinician" ? "text-on-navy-soft" : "text-ink-soft"}`}>
        {caption}
      </p>
      <p lang={lang} dir={dir} className="mt-0.5 font-display text-lg font-semibold leading-snug">
        {children}
      </p>
    </div>
  );
}
