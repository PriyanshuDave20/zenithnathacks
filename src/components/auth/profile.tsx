"use client";

import { HomeLink } from "@/components/auth/home-link";
import { HubTheme } from "@/components/accessibility/hub-theme";
import { ThemeToggle } from "@/components/accessibility/theme-toggle";

import { LoadingStatus } from "@/components/ui/spinner";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { SynapseMark } from "@/components/brand/synapse-logo";
import { ArrowRight, Check, Shield } from "@/components/home/icons";
import { signOut, updateProfile, useClinician, USING_MOCK_AUTH, type ClinicianProfile, type ClinicianRole } from "./api";
import { FormError, initials, SubmitButton, TextField } from "./auth-ui";
import { RolePicker } from "./forms";

// Languages a clinician may speak; the session app supports the first four today. Only languages shown here can be saved.
const LANGS: { code: string; name: string; english: string }[] = [
  { code: "en", name: "English", english: "English" },
  { code: "es", name: "Español", english: "Spanish" },
  { code: "ar", name: "العربية", english: "Arabic" },
  { code: "zh-Hans", name: "中文", english: "Mandarin" },
  { code: "fr", name: "Français", english: "French" },
];

export function ProfilePage() {
  const me = useClinician();
  const router = useRouter();

  useEffect(() => {
    if (me === null) router.replace("/signin?next=/profile");
  }, [me, router]);

  if (me === "loading" || me === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground">
        <LoadingStatus label={"Loading your profile"} />
      </div>
    );
  }
  return <ProfileForm key={me.id} me={me} />;
}

function ProfileForm({ me }: { me: ClinicianProfile }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: me.name, clinic: me.clinic, role: me.role as ClinicianRole, languages: me.languages.filter((code) => LANGS.some((l) => l.code === code)) });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const welcome = useSearchParams().has("welcome");
  const dirty =
    form.name !== me.name || form.clinic !== me.clinic || form.role !== me.role || form.languages.join() !== me.languages.filter((code) => LANGS.some((l) => l.code === code)).join();

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!form.name.trim()) {
      setError("Enter your name.");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ name: form.name.trim(), clinic: form.clinic.trim(), role: form.role, languages: form.languages });
      setSaved(true);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/signin");
    } catch {
      setError("Couldn’t sign out. Please try again.");
      setSigningOut(false);
    }
  }

  const toggleLang = (code: string) =>
    setForm((f) => ({ ...f, languages: f.languages.includes(code) ? f.languages.filter((c) => c !== code) : [...f.languages, code] }));

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <HubTheme />
      <header className="on-navy sticky top-0 z-30 border-b border-white/10 bg-navy/92 pt-[env(safe-area-inset-top)] text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <HomeLink className="rounded-lg" aria-label="Synapse home">
            <SynapseMark className="h-9 w-auto" />
          </HomeLink>
          <span className="font-display text-lg font-bold">Profile</span>
          <span className="ms-auto">
            <ThemeToggle />
          </span>
          <Link
            href="/start"
            className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-blue px-5 text-base font-semibold text-navy hover:bg-white"
          >
            Start a session <ArrowRight size={18} />
          </Link>
        </div>
      </header>

      <main className="screen-in mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-12">
        {welcome && !saved ? (
          <p role="status" className="mb-8 flex items-start gap-3 rounded-[1.5rem] bg-blue-soft p-5 text-lg leading-relaxed text-ink">
            <Check size={22} className="mt-1 shrink-0 text-blue-deep" />
            Your account is ready. Add your clinic and the languages you speak, or start a session now.
          </p>
        ) : null}

        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-navy font-display text-2xl font-bold text-white">
            {initials(me.name, me.email)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[clamp(1.75rem,5vw,2.5rem)] font-bold leading-tight tracking-[-0.025em]">{me.name || "Your profile"}</h1>
            <p className="truncate text-base text-ink-soft">{me.email}</p>
            <p className="text-sm text-ink-soft">{me.provider === "google" ? "Signed in with Google" : "Email and password"}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <form onSubmit={onSave} noValidate className="flex flex-col gap-6">
            <h2 className="font-display text-2xl font-bold">Your details</h2>
            {error ? <FormError>{error}</FormError> : null}
            <TextField label="Full name" name="name" autoComplete="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <RolePicker value={form.role} onChange={(r) => setForm((f) => ({ ...f, role: r }))} />
            <TextField label="Clinic or hospital" name="clinic" autoComplete="organization" value={form.clinic} onChange={(e) => setForm((f) => ({ ...f, clinic: e.target.value }))} />
            <fieldset>
              <legend className="text-base font-semibold text-ink">Languages you speak</legend>
              <p className="mt-1 text-sm text-ink-soft">Used to tailor your sessions later. Pick all that apply.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {LANGS.map((l) => {
                  const on = form.languages.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleLang(l.code)}
                      className={`press inline-flex min-h-12 items-center gap-1.5 rounded-full px-4 text-base font-semibold ${
                        on ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:ring-ink-soft"
                      }`}
                    >
                      {on ? <Check size={16} /> : null}
                      <span lang={l.code}>{l.name}</span>
                      {l.english !== l.name ? <span className={`text-sm font-medium ${on ? "text-white/85" : "text-ink-soft"}`}>{l.english}</span> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="sm:w-56">
                <SubmitButton busy={busy} busyLabel="Saving…">
                  Save changes
                </SubmitButton>
              </div>
              <p aria-live="polite" className="text-base font-semibold text-blue-deeper">
                {saved && !dirty ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={18} /> Saved
                  </span>
                ) : null}
              </p>
            </div>
          </form>

          <div className="flex flex-col gap-5">
            <section aria-labelledby="plan-title" className="rounded-[2rem] bg-navy p-6 text-white sm:p-7">
              <h2 id="plan-title" className="font-display text-2xl font-bold">
                {me.plan.name}
              </h2>
              <p className="mt-3 inline-flex items-center rounded-full bg-navy-raised px-3 py-1 text-sm font-semibold text-blue">
                Free clinician account
              </p>
              <p className="mt-5 text-sm leading-relaxed text-on-navy-soft">
                Plans and billing are not connected.
              </p>
            </section>
            <p className="flex items-start gap-3 rounded-[1.5rem] bg-ground-2 p-5 text-base leading-relaxed text-ink-soft">
              <Shield size={22} className="mt-0.5 shrink-0 text-blue-deep" />
              This account holds only your details. Nothing about your patients is ever stored here or anywhere in Synapse.
            </p>
            {USING_MOCK_AUTH ? (
              <p className="rounded-[1.25rem] bg-ground-2 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                Demo account: accounts are simulated in this browser until the account service is connected.
              </p>
            ) : null}
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="press inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-semibold text-blue-deeper ring-1 ring-line hover:bg-blue-soft disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
