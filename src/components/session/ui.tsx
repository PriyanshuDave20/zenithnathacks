import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { LoadingStatus } from "@/components/ui/spinner";
import { Check } from "@/components/home/icons";

export type Holder = "Clinician" | "Patient";

export function HolderPill({ holder, onNavy = false }: { holder: Holder; onNavy?: boolean }) {
  const cls =
    holder === "Clinician"
      ? onNavy
        ? "bg-navy-raised text-white"
        : "bg-navy text-white"
      : "bg-blue-soft text-blue-deeper";
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>{holder}</span>;
}

/** Page frame for one stage: a readable column that widens on tablets and desktops. */
export function Screen({
  children,
  wide = false,
  label,
  dir,
  lang,
}: {
  children: ReactNode;
  wide?: boolean;
  label: string;
  dir?: "ltr" | "rtl";
  lang?: string;
}) {
  return (
    <section
      aria-label={label}
      dir={dir}
      lang={lang}
      className={`screen-in mx-auto flex w-full flex-1 flex-col px-4 pb-6 pt-6 sm:px-6 sm:pt-10 ${wide ? "max-w-5xl" : "max-w-2xl"}`}
    >
      {children}
    </section>
  );
}

/**
 * Sticky bottom actions: a floating rounded capsule that hugs its buttons (no full-width bar or hard
 * border), inside thumb reach on phones and clear of the home indicator. The wrapper ignores pointer
 * events so only the capsule itself catches taps; content scrolls past around it.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none sticky bottom-0 z-10 mt-auto flex justify-center pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:justify-end">
      <div className="pointer-events-auto flex w-full flex-col-reverse gap-2 rounded-[2rem] bg-surface/90 p-2 shadow-lift ring-1 ring-line backdrop-blur-xl sm:w-auto sm:flex-row sm:items-center">
        {children}
      </div>
    </div>
  );
}

type BtnProps = Omit<ButtonProps, "variant" | "width">;

export function PrimaryButton(props: BtnProps) {
  return <Button {...props} />;
}

export function QuietButton(props: BtnProps) {
  return <Button {...props} variant="quiet" />;
}

/** A selectable pill. Selected is fill plus check (form before hue). */
export function ChoicePill({
  on,
  onClick,
  children,
  icon,
  lang,
  className = "",
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  lang?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      lang={lang}
      className={`press flex min-h-14 items-center gap-2.5 rounded-full px-5 text-left text-lg font-semibold ${
        on ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:ring-ink-soft"
      } ${className}`}
    >
      <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center ${on ? "" : "text-blue-deep"}`}>
        {on ? <Check size={18} /> : icon ?? <span className="size-5 rounded-full ring-2 ring-inset ring-line" />}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

/** Large picture answer for guided questions (low literacy friendly). */
export function Tile({
  on,
  onClick,
  icon,
  children,
  lang,
}: {
  on: boolean;
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
  lang?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      lang={lang}
      className={`press flex min-h-32 flex-col items-center justify-center gap-3 rounded-bubble-sm p-4 text-center text-lg font-semibold sm:min-h-44 sm:text-xl ${
        on ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:bg-blue-soft"
      }`}
    >
      {icon ? (
        <span aria-hidden="true" className={`[&>svg]:size-10 sm:[&>svg]:size-14 ${on ? "text-white" : "text-blue-deep"}`}>
          {icon}
        </span>
      ) : null}
      <span className="flex items-center gap-1.5">
        {on ? <Check size={18} /> : null}
        {children}
      </span>
    </button>
  );
}

/** Patient-language content with one tail corner on the speaker's side. */
export function SpeechBubble({
  tone,
  caption,
  children,
  lang,
  dir,
  size = "lg",
  full = false,
}: {
  tone: "patient" | "readback" | "clinician";
  caption: string;
  children: ReactNode;
  lang?: string;
  dir?: "ltr" | "rtl";
  size?: "md" | "lg";
  full?: boolean;
}) {
  const shape =
    tone === "patient"
      ? "self-start rounded-bubble rounded-bl-tail bg-blue-soft text-ink"
      : tone === "readback"
        ? "self-end rounded-bubble rounded-br-tail bg-ground-2 text-ink"
        : "self-end rounded-bubble rounded-br-tail bg-navy text-white";
  return (
    <div className={`arrive max-w-full px-5 py-4 ${full ? "self-stretch" : "sm:max-w-[90%]"} ${shape}`}>
      <p className={`text-sm font-medium ${tone === "clinician" ? "text-on-navy-soft" : "text-ink-soft"}`}>{caption}</p>
      <p
        lang={lang}
        dir={dir}
        className={`mt-1 whitespace-pre-line font-display font-semibold leading-snug ${size === "lg" ? "text-bubble" : "text-xl"}`}
      >
        {children}
      </p>
    </div>
  );
}

/** Screen heading in the holder's language. */
export function Title({ children, lang, dir }: { children: ReactNode; lang?: string; dir?: "ltr" | "rtl" }) {
  return (
    <h1
      lang={lang}
      dir={dir}
      className="font-display text-screen-title font-bold leading-[1.05] tracking-[-0.025em] [text-wrap:balance]"
    >
      {children}
    </h1>
  );
}

export function Spinner({ label }: { label: string }) {
  return <LoadingStatus label={label} />;
}
