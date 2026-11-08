"use client";

import { HomeLink } from "@/components/auth/home-link";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { SynapseMark, SynapseWordmark } from "@/components/brand/synapse-logo";
import { SynapseMark3D } from "@/components/brand/synapse-mark-3d";
import { Alert } from "@/components/home/icons";
import { Button } from "@/components/ui/button";
import { SpinnerIcon } from "@/components/ui/spinner";
import { USING_MOCK_AUTH } from "./api";

/** Shared frame for sign-in, sign-up, and password reset: brand panel (desktop) beside a focused form. */
export function AuthShell({ title, lede, children, footer }: { title: string; lede: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ground lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      {/* Phones: compact navy bar. Desktop: a full-height navy brand panel. */}
      <header className="on-navy flex items-center justify-between bg-navy px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white sm:px-8 lg:hidden">
        <HomeLink aria-label="Synapse home" className="flex items-center gap-2.5 rounded-lg">
          <SynapseMark className="h-9 w-auto" />
          <SynapseWordmark className="h-[0.9rem] w-auto" />
        </HomeLink>
      </header>
      <aside className="on-navy relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <HomeLink aria-label="Synapse home" className="flex w-fit items-center gap-2.5 rounded-lg">
          <SynapseMark className="h-10 w-auto" />
          <SynapseWordmark className="h-4 w-auto" />
        </HomeLink>
        <div>
          <SynapseMark3D className="h-48 w-[10.3rem]" />
          <p className="mt-10 max-w-[22ch] font-display text-[2.25rem] font-bold leading-[1.08] tracking-[-0.025em] [text-wrap:balance]">
            Every patient, <span className="text-blue">understood.</span>
          </p>
          <p className="mt-4 max-w-[34rem] text-lg leading-relaxed text-on-navy-soft">
            Your account is yours alone. Synapse never keeps anything about your patients.
          </p>
        </div>
        <p className="text-sm text-on-navy-soft">A communication aid, not a diagnostic tool or a certified interpreter.</p>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-8 sm:px-8 sm:pt-14 lg:items-center lg:py-16">
        <div className="screen-in w-full max-w-[26rem]">
          <h1 className="font-display text-[clamp(2rem,6.5vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.025em] [text-wrap:balance]">{title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">{lede}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-base text-ink-soft">{footer}</div>
          {USING_MOCK_AUTH ? (
            <p className="mt-10 rounded-inset bg-ground-2 px-4 py-3 text-sm leading-relaxed text-ink-soft">
              Demo sign-in: accounts are simulated in this browser until the account service is connected. Passwords are never
              stored.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export function TextField({ label, hint, error, id, className = "", ...rest }: FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  const hintId = `${fid}-hint`;
  const errId = `${fid}-err`;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={fid} className="text-base font-semibold text-ink">
        {label}
      </label>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && !error ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined}
        className={`field-control min-h-14 rounded-inset px-5 text-lg ${
          error ? "ring-2 ring-ink" : "ring-line"
        }`}
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Alert size={16} className="text-blue-deep" /> {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type">) {
  const [shown, setShown] = useState(false);
  const auto = useId();
  const fid = props.id ?? auto;
  return (
    <div className="relative">
      <TextField {...props} id={fid} type={shown ? "text" : "password"} className="[&_input]:pr-24" />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-controls={fid}
        className="press absolute right-2 top-[2.4rem] min-h-11 rounded-full px-4 text-sm font-semibold text-blue-deeper hover:bg-blue-soft"
      >
        {shown ? "Hide" : "Show"}
        <span className="sr-only"> password</span>
      </button>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-inset bg-ground-2 px-4 py-3 text-base font-semibold text-ink">
      <Alert size={20} className="mt-0.5 shrink-0 text-blue-deep" />
      {children}
    </p>
  );
}

export function SubmitButton({ busy, children, busyLabel }: { busy: boolean; children: ReactNode; busyLabel: string }) {
  return (
    <Button type="submit" width="full" disabled={busy} aria-busy={busy} icon={busy ? <SpinnerIcon inverse /> : undefined}>
      {busy ? busyLabel : children}
    </Button>
  );
}

/** "Continue with Google" per Google's sign-in button guidance: white surface, the four-colour G, plain label. */
export function GoogleButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <Button variant="outline" width="full" onClick={onClick} disabled={busy} aria-busy={busy}>
      <svg className="inline-block shrink-0 align-middle me-3" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 7.2-9.6 7.2-17z" />
        <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.2-8.8 2.2-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
      </svg>
      {busy ? "Connecting…" : "Continue with Google"}
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4 text-sm font-medium text-ink-soft" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      or with email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function initials(name: string, email: string) {
  const src = name.trim() || email;
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
