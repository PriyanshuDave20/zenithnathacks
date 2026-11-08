"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SynapseMark, SynapseWordmark } from "@/components/brand/synapse-logo";
import { ArrowRight, Handoff, Shield } from "@/components/home/icons";
import { signOut, useClinician } from "@/components/auth/api";
import { initials } from "@/components/auth/auth-ui";
import { SESSION_TIMEOUT_OPTIONS, setSessionTimeout, useSessionTimeout } from "@/lib/session-timeout";
import { COPY_OPTIONS, setSummaryPrefs, useSummaryPrefs } from "@/lib/summary-prefs";
import { HubTheme } from "@/components/accessibility/hub-theme";
import { ThemeToggle } from "@/components/accessibility/theme-toggle";
import { SetupCheck } from "./setup-check";

const roles = { doctor: "Doctor", nurse: "Nurse", other: "Clinician" };

export function ClinicianDashboard() {
  const me = useClinician();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeout = useSessionTimeout();
  const prefs = useSummaryPrefs();
  const [prefsSaved, setPrefsSaved] = useState(false);
  const savePrefs = (patch: Parameters<typeof setSummaryPrefs>[0]) => {
    setSummaryPrefs(patch);
    setPrefsSaved(true);
  };

  async function onSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      router.replace("/signin");
    } catch {
      setSigningOut(false);
      setError("Could not sign out. Please try again.");
    }
  }

  if (!me || me === "loading") return null; // RequireClinician owns the account-loading state.

  return (
    <div className="flex min-h-dvh flex-col bg-ground-2 text-ink">
      <HubTheme />
      <a href="#clinician-home" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-full focus:bg-surface focus:px-6 focus:py-3 focus:text-ink">Skip to content</a>
      <header className="on-navy bg-navy pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex min-h-20 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/dashboard" aria-label="Synapse home" className="flex min-h-11 items-center gap-3 rounded-lg">
            <SynapseMark className="h-9 w-auto" />
            <SynapseWordmark className="hidden h-3.5 w-auto min-[420px]:block" />
          </Link>
          <nav aria-label="Clinician navigation" className="flex max-w-full flex-wrap items-center gap-1 sm:gap-2">
            <Link href="/dashboard" aria-current="page" className="press inline-flex min-h-11 items-center rounded-full bg-navy-raised px-4 text-sm font-semibold sm:text-base">Home</Link>
            <Link href="/profile" className="press inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-on-navy-soft hover:bg-navy-raised hover:text-white sm:text-base">Profile</Link>
            <button type="button" onClick={onSignOut} disabled={signingOut} className="press min-h-11 rounded-full px-3 text-sm font-semibold text-on-navy-soft hover:bg-navy-raised hover:text-white disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:text-base">
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="clinician-home" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-12 pt-9 sm:px-8 sm:pb-16 sm:pt-12">
        {error ? <p role="alert" className="mb-6 rounded-field bg-surface p-4 text-ink">{error}</p> : null}
        <div className="mb-8 sm:mb-10">
          <h1 className="break-words font-display text-3xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl">Welcome back{me.name.trim() ? `, ${me.name.trim().split(/\s+/)[0]}` : ""}.</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">Your space to help the next patient be understood.</p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-8">
          <section aria-labelledby="new-session-title" className="on-navy flex min-w-0 min-h-80 flex-col rounded-sheet bg-navy p-7 text-white sm:min-h-96 sm:p-9">
            <Handoff size={32} className="mb-7 text-blue" />
            <h2 id="new-session-title" className="max-w-sm break-words font-display [overflow-wrap:anywhere] text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">A new conversation starts here.</h2>
            <p className="mb-8 mt-4 max-w-md text-base leading-relaxed text-on-navy-soft">Choose the patient’s language and how they want to communicate. You decide when to begin.</p>
            {/* A fresh document clears visit memory even if the router cached a prior workspace. */}
            <a href="/start" className="press mt-auto inline-flex min-h-14 flex-wrap w-full items-center justify-center gap-3 self-start rounded-full bg-blue px-6 py-3 text-base font-semibold text-navy hover:bg-white sm:w-auto sm:text-lg">
              Start new session <ArrowRight size={20} />
            </a>
          </section>

          <section aria-labelledby="profile-title" className="min-w-0 rounded-sheet bg-surface p-7 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 id="profile-title" className="font-display text-xl font-semibold">Your profile</h2>
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-soft text-sm font-bold text-blue-deeper">{initials(me.name, me.email)}</span>
            </div>
            <p className="break-words text-lg font-semibold">{me.name || "Your account"}</p>
            <p className="mt-1 text-base text-ink-soft">{roles[me.role]}</p>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-ink-soft">Work email</dt>
                <dd className="mt-1 break-all font-medium">{me.email}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Clinic</dt>
                <dd className="mt-1 break-words font-medium">{me.clinic.trim() || "Add your clinic in your profile"}</dd>
              </div>
            </dl>
            <Link href="/profile" className="press mt-6 inline-flex min-h-11 items-center gap-2 rounded-full py-2 pe-3 text-base font-semibold text-blue-deeper hover:underline">
              Manage profile <ArrowRight size={18} />
            </Link>
          </section>
        </div>

        <section aria-labelledby="timeout-title" className="mt-6 min-w-0 rounded-sheet bg-surface p-7 sm:p-8">
          <h2 id="timeout-title" className="font-display text-xl font-semibold">Session timeout</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            A conversation clears itself after this long without activity, and a 30-second warning with Keep session comes first. You can also clear it yourself at any time. Saved on this device only.
          </p>
          <div role="radiogroup" aria-labelledby="timeout-title" className="mt-5 flex flex-wrap gap-2">
            {SESSION_TIMEOUT_OPTIONS.map((o) => (
              <label key={o.id} className="press relative inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-base font-semibold ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-ground has-[:checked]:ring-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-deeper">
                <input type="radio" name="session-timeout" value={o.id} checked={timeout === o.id} onChange={() => setSessionTimeout(o.id)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                {o.label}{o.id === "6h" ? " (default)" : ""}
              </label>
            ))}
          </div>
        </section>

        <section aria-labelledby="summary-title" className="mt-6 min-w-0 rounded-sheet bg-surface p-7 sm:p-8">
          <h2 id="summary-title" className="font-display text-xl font-semibold">How I read summaries</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            How the clinician summary looks for you and what the Copy button copies. These are about how you read, not about any patient. Summaries are in English for now. Flags to check are never hidden. Saved on this device only.
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <fieldset className="min-w-0">
              <legend className="text-base font-semibold">Detail</legend>
              <div role="radiogroup" aria-label="Summary detail" className="mt-2 flex flex-wrap gap-2">
                {[{ id: "full", label: "Full" }, { id: "brief", label: "Brief" }].map((o) => (
                  <label key={o.id} className="press relative inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-base font-semibold ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-ground has-[:checked]:ring-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-deeper">
                    <input type="radio" name="summary-detail" value={o.id} checked={prefs.detail === o.id} onChange={() => savePrefs({ detail: o.id as "full" | "brief" })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                    {o.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-ink-soft">Brief keeps the original words and read-back behind one tap.</p>
              <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-base">
                <input type="checkbox" checked={prefs.flagsFirst} onChange={(event) => savePrefs({ flagsFirst: event.target.checked })} className="size-5" />
                Show “Flags to check” first
              </label>
            </fieldset>
            <fieldset className="min-w-0">
              <legend className="text-base font-semibold">Copy puts this on the clipboard</legend>
              <div role="radiogroup" aria-label="What Copy copies" className="mt-2 flex flex-wrap gap-2">
                {COPY_OPTIONS.map((o) => (
                  <label key={o.id} className="press relative inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-base font-semibold ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-ground has-[:checked]:ring-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-deeper">
                    <input type="radio" name="summary-copy" value={o.id} checked={prefs.copy === o.id} onChange={() => savePrefs({ copy: o.id })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <p aria-live="polite" className="mt-4 min-h-5 text-sm text-ink-soft">{prefsSaved ? "Saved on this device." : ""}</p>
        </section>

        <SetupCheck />

        <aside aria-label="Session privacy" className="my-7 flex max-w-2xl items-start gap-3 text-sm leading-relaxed text-ink-soft sm:my-8">
          <Shield size={20} className="mt-0.5 shrink-0 text-blue-deeper" />
          <p>Each conversation is temporary. Patient messages and session details aren’t saved to your account.</p>
        </aside>

        <section aria-labelledby="future-tools-title" className="border-t border-line pt-7 sm:pt-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 id="future-tools-title" className="font-display text-xl font-semibold">Room for what’s next</h2>
            <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-blue-deeper">Future features</span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">More clinician tools can live here as Synapse grows.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Reserved spaces for upcoming features">
            {["Saved quick replies"].map(label => (
              <div key={label} className="flex min-h-24 flex-wrap items-center justify-between gap-4 rounded-inset border border-dashed border-ink-soft/40 px-5 py-5">
                <span className="text-sm font-medium text-ink-soft">{label}</span>
                <span className="text-xs text-ink-soft">Not available yet</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs leading-relaxed text-ink-soft sm:px-8">
        A communication aid, not a diagnostic tool or a certified interpreter.
      </footer>
    </div>
  );
}
