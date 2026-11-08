"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Check } from "@/components/home/icons";
import { requestPasswordReset, USING_MOCK_AUTH, safeNext, signIn, signInWithGoogle, signUp, useClinician, type AuthError, type ClinicianRole } from "./api";
import { AuthShell, FormError, GoogleButton, OrDivider, PasswordField, SubmitButton, TextField } from "./auth-ui";

const nextFromUrl = () => (typeof window === "undefined" ? "/dashboard" : safeNext(new URLSearchParams(window.location.search).get("next")));
const message = (e: unknown) => (e as AuthError)?.message ?? "Something went wrong. Check your connection and try again.";

/** Validation renders before focus moves; field errors remain associated with their inputs. */
function focusFirstInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
}

function clearEditedError(event: FormEvent<HTMLFormElement>, clear: (name: string) => void) {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.name) clear(input.name);
}

/** Already signed in? Skip the form and go where they were headed. */
function useRedirectIfSignedIn() {
  const router = useRouter();
  const me = useClinician();
  useEffect(() => {
    if (me && me !== "loading") router.replace(nextFromUrl());
  }, [me, router]);
}

export function SignInForm() {
  const router = useRouter();
  useRedirectIfSignedIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fe: Record<string, string> = {};
    if (!email.trim()) fe.email = "Enter your work email.";
    if (!password) fe.password = "Enter your password.";
    setFieldErrors(fe);
    if (Object.keys(fe).length) { focusFirstInvalid(e.currentTarget); return; }
    setBusy("email");
    try {
      await signIn({ email, password });
      router.replace(nextFromUrl());
    } catch (err) {
      setError(message(err));
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle();
      router.replace(nextFromUrl());
    } catch (err) {
      setError(message(err));
      setBusy(null);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      lede="Welcome back. Sign in to your clinician home."
      footer={
        <>
          New to Synapse?{" "}
          <Link href="/signup" className="font-semibold text-blue-deeper underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton onClick={onGoogle} busy={busy === "google"} />
      <OrDivider />
      <form onSubmit={onSubmit} onInput={(event) => clearEditedError(event, name => setFieldErrors(current => ({ ...current, [name]: "" })))} noValidate className="flex flex-col gap-5">
        {Object.values(fieldErrors).some(Boolean) ? <FormError>Please check the highlighted fields.</FormError> : null}
        {error ? <FormError>{error}</FormError> : null}
        <TextField label="Work email" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <PasswordField label="Password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
        <Link href="/forgot-password" className="-mt-2 w-fit text-base font-semibold text-blue-deeper underline">
          Forgot password?
        </Link>
        <SubmitButton busy={busy === "email"} busyLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

const ROLES: { id: ClinicianRole; label: string }[] = [
  { id: "doctor", label: "Doctor" },
  { id: "nurse", label: "Nurse" },
  { id: "other", label: "Other" },
];

export function RolePicker({ value, onChange }: { value: ClinicianRole; onChange: (r: ClinicianRole) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold text-ink">Role</legend>
      <div className="grid grid-cols-3 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={value === r.id}
            onClick={() => onChange(r.id)}
            className={`press flex min-h-12 items-center justify-center gap-1.5 rounded-full px-3 text-base font-semibold ${
              value === r.id ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:ring-ink-soft"
            }`}
          >
            {value === r.id ? <Check size={16} /> : null}
            {r.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SignUpForm() {
  const router = useRouter();
  useRedirectIfSignedIn();
  const [form, setForm] = useState({ name: "", email: "", password: "", clinic: "", role: "doctor" as ClinicianRole });
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fe: Record<string, string> = {};
    if (!form.name.trim()) fe.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) fe.email = "Enter a valid email address.";
    if (form.password.length < 8) fe.password = "Use at least 8 characters.";
    setFieldErrors(fe);
    if (Object.keys(fe).length) { focusFirstInvalid(e.currentTarget); return; }
    setBusy("email");
    try {
      await signUp(form);
      router.replace("/dashboard");
    } catch (err) {
      setError(message(err));
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError(message(err));
      setBusy(null);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      lede="Your clinician account holds only your own details. Nothing about your patients is ever kept."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold text-blue-deeper underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton onClick={onGoogle} busy={busy === "google"} />
      <OrDivider />
      <form onSubmit={onSubmit} onInput={(event) => clearEditedError(event, name => setFieldErrors(current => ({ ...current, [name]: "" })))} noValidate className="flex flex-col gap-5">
        {Object.values(fieldErrors).some(Boolean) ? <FormError>Please check the highlighted fields.</FormError> : null}
        {error ? <FormError>{error}</FormError> : null}
        <TextField label="Full name" name="name" autoComplete="name" required value={form.name} onChange={(e) => set("name")(e.target.value)} error={fieldErrors.name} />
        <TextField label="Work email" type="email" name="email" autoComplete="email" inputMode="email" required value={form.email} onChange={(e) => set("email")(e.target.value)} error={fieldErrors.email} />
        <PasswordField label="Password" name="password" autoComplete="new-password" required hint="At least 8 characters." value={form.password} onChange={(e) => set("password")(e.target.value)} error={fieldErrors.password} />
        <RolePicker value={form.role} onChange={(r) => setForm((f) => ({ ...f, role: r }))} />
        <TextField label="Clinic or hospital" name="clinic" autoComplete="organization" hint="Optional. Shown on your profile." value={form.clinic} onChange={(e) => set("clinic")(e.target.value)} />
        <SubmitButton busy={busy === "email"} busyLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      lede={USING_MOCK_AUTH ? "Try the password-reset screen. Email delivery is not connected in this demo." : "Enter your work email and we’ll send you a link to choose a new password."}
      footer={
        <Link href="/signin" className="font-semibold text-blue-deeper underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div role="status" className="flex items-start gap-3 rounded-[1.5rem] bg-blue-soft p-5 text-lg leading-relaxed text-ink">
          <Check size={22} className="mt-1 shrink-0 text-blue-deep" />
          {USING_MOCK_AUTH
            ? "This is a demo. No reset email was sent. Return to sign in to continue with a demo account."
            : `If an account exists for ${email.trim()}, a reset link is on its way. Check your inbox.`}
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {error ? <FormError>{error}</FormError> : null}
          <TextField label="Work email" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <SubmitButton busy={busy} busyLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
