// Frontend mock of clinician accounts (docs/API.md "Clinician accounts"). Backend 1 replaces this with real
// routes; the UI reaches it only through src/components/auth/api.ts.
//
// Accounts are for clinicians only (their own profile). Never patient data.
// The mock keeps the signed-in clinician's profile in this browser's localStorage so the gate on /start works
// across reloads. It NEVER stores passwords: any password of 8+ characters is accepted.

export type ClinicianRole = "doctor" | "nurse" | "other";

export type ClinicianProfile = {
  id: string;
  email: string;
  name: string;
  role: ClinicianRole;
  clinic: string;
  languages: string[]; // BCP-47 codes the clinician speaks, e.g. ["en", "es"]
  plan: { name: string; status: "active" | "trial"; renews: string }; // display only; no billing in the mock
  provider: "password" | "google";
};

export type AuthError = { code: "invalid" | "exists" | "weak_password" | "not_found" | "network"; message: string };

const SESSION_KEY = "synapse.mock.session";
const ACCOUNTS_KEY = "synapse.mock.accounts";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => 500 + Math.round(Math.random() * 400);

function readAccounts(): Record<string, ClinicianProfile> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writeAccounts(a: Record<string, ClinicianProfile>) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
  } catch {
    /* storage unavailable: mock still works for this page view */
  }
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function subscribeSession(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === SESSION_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Cached snapshot so useSyncExternalStore sees a stable value between changes. */
let cachedRaw: string | null | undefined;
let cachedProfile: ClinicianProfile | null = null;
export function getSessionSnapshot(): ClinicianProfile | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SESSION_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedProfile = raw ? (JSON.parse(raw) as ClinicianProfile) : null;
    } catch {
      cachedProfile = null;
    }
  }
  return cachedProfile;
}

function setSession(p: ClinicianProfile | null) {
  try {
    if (p) localStorage.setItem(SESSION_KEY, JSON.stringify(p));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

const normalizeEmail = (e: string) => e.trim().toLowerCase();
const DEFAULT_PLAN = { name: "Clinic plan", status: "trial" as const, renews: "in 14 days" };

function newProfile(email: string, partial: Partial<ClinicianProfile>, provider: ClinicianProfile["provider"]): ClinicianProfile {
  return {
    id: `c_${Math.random().toString(36).slice(2, 10)}`,
    email,
    name: partial.name ?? "",
    role: partial.role ?? "doctor",
    clinic: partial.clinic ?? "",
    languages: partial.languages ?? ["en"],
    plan: DEFAULT_PLAN,
    provider,
  };
}

export async function mockSignUp(input: {
  email: string;
  password: string;
  name: string;
  role: ClinicianRole;
  clinic: string;
}): Promise<ClinicianProfile> {
  await delay(latency());
  const email = normalizeEmail(input.email);
  if (input.password.length < 8) throw { code: "weak_password", message: "Use at least 8 characters." } satisfies AuthError;
  const accounts = readAccounts();
  if (accounts[email]) throw { code: "exists", message: "An account with this email already exists. Sign in instead." } satisfies AuthError;
  const profile = newProfile(email, { name: input.name.trim(), role: input.role, clinic: input.clinic.trim() }, "password");
  accounts[email] = profile;
  writeAccounts(accounts);
  setSession(profile);
  return profile;
}

export async function mockSignIn(input: { email: string; password: string }): Promise<ClinicianProfile> {
  await delay(latency());
  const email = normalizeEmail(input.email);
  if (input.password.length < 8) throw { code: "invalid", message: "That email and password don’t match." } satisfies AuthError;
  const accounts = readAccounts();
  // Demo convenience: an unknown email signs in to a fresh account so a presenter is never locked out.
  const profile = accounts[email] ?? newProfile(email, {}, "password");
  accounts[email] = profile;
  writeAccounts(accounts);
  setSession(profile);
  return profile;
}

export async function mockSignInWithGoogle(): Promise<ClinicianProfile> {
  await delay(latency());
  const email = "clinician.demo@gmail.com";
  const accounts = readAccounts();
  const profile = accounts[email] ?? newProfile(email, { name: "Demo Clinician" }, "google");
  accounts[email] = profile;
  writeAccounts(accounts);
  setSession(profile);
  return profile;
}

export async function mockRequestPasswordReset(email: string): Promise<void> {
  await delay(latency());
  void normalizeEmail(email); // the real route emails a reset link; the mock always "succeeds" (no account enumeration)
}

export async function mockUpdateProfile(patch: Partial<Pick<ClinicianProfile, "name" | "role" | "clinic" | "languages">>): Promise<ClinicianProfile> {
  await delay(latency());
  const current = getSessionSnapshot();
  if (!current) throw { code: "not_found", message: "You’re signed out. Sign in again." } satisfies AuthError;
  const next = { ...current, ...patch };
  const accounts = readAccounts();
  accounts[next.email] = next;
  writeAccounts(accounts);
  setSession(next);
  return next;
}

export async function mockSignOut(): Promise<void> {
  await delay(200);
  setSession(null);
}
