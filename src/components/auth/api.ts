"use client";

import { useSyncExternalStore } from "react";
import { eye } from "@/lib/eye/session";
import { setGazeAvailable } from "@/components/input/gaze/gaze-availability";
import {
  ClinicianProfileSchema,
  type ClinicianProfile,
  type SignUpInput,
  type SignInInput,
  type ProfilePatch,
} from "@/lib/contracts/auth";
import { createClinicianStore } from "./session-store";
import { safeNext } from "./redirect";

export type { AuthError, ClinicianProfile, ClinicianRole } from "@/lib/contracts/auth";
export const USING_MOCK_AUTH = false;

function clearPatientSession() {
  eye.clear();
  setGazeAvailable(false);
  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
    window.dispatchEvent(new Event("synapse:gaze-stop"));
  }
}

async function request(path: string, method = "GET", body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method, credentials: "same-origin", cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw { code: "network", message: "Couldn’t reach the account service. Try again." };
  }
  if (!response.ok) {
    if (response.status === 401 && path === "/api/me") return null;
    const data = await response.json().catch(() => null);
    throw { code: data?.error?.code ?? "network", message: data?.error?.message ?? "The account service is unavailable. Try again." };
  }
  return response.status === 204 ? undefined : response.json();
}

const store = createClinicianStore(() => request("/api/me"), clearPatientSession);
let channel: BroadcastChannel | undefined;
let watching = false;
function watch() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("synapse:clinician-session");
    channel.onmessage = () => {
      store.invalidate();
      void store.refresh();
    };
  }
  window.addEventListener("focus", () => { void store.refresh(); });
  window.addEventListener("pageshow", () => { void store.refresh(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void store.refresh();
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible") void store.refresh();
  }, 60_000);
}
function notify() { channel?.postMessage("changed"); }

async function authenticate(path: string, input: unknown): Promise<ClinicianProfile> {
  const profile = ClinicianProfileSchema.parse(await request(path, "POST", input));
  clearPatientSession();
  store.set(profile);
  notify();
  return profile;
}
export const signUp = (input: SignUpInput) => authenticate("/api/auth/signup", input);
export const signIn = (input: SignInInput) => authenticate("/api/auth/signin", input);
export async function signInWithGoogle(): Promise<never> {
  const capability = await request("/api/auth/capabilities") as { google: boolean };
  if (!capability.google) throw { code: "unavailable", message: "Google sign-in is not configured yet. Use email and password." };
  clearPatientSession();
  const next = safeNext(new URLSearchParams(window.location.search).get("next"));
  // OAuth must enter the server route as a document navigation to follow Google redirects.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/api/auth/google?next=${encodeURIComponent(next)}`);
  // Navigation owns the successful result; forms must not replace it with a client redirect.
  return new Promise<never>(() => {});
}
export async function requestPasswordReset(email: string): Promise<void> {
  await request("/api/auth/forgot-password", "POST", { email });
}
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await request("/api/auth/reset-password", "POST", { token, newPassword });
  store.invalidate();
  notify();
}
export async function updateProfile(patch: ProfilePatch): Promise<ClinicianProfile> {
  const profile = ClinicianProfileSchema.parse(await request("/api/me", "PATCH", patch));
  store.set(profile);
  notify();
  return profile;
}
export async function signOut(): Promise<void> {
  // Clear patient content immediately, even if revocation must be retried.
  clearPatientSession();
  await request("/api/auth/signout", "POST");
  store.invalidate();
  notify();
}

const subscribe = (listener: () => void) => {
  watch();
  const unsubscribe = store.subscribe(listener);
  void store.refresh();
  return unsubscribe;
};
/** Refreshes from the server; legacy browser mock accounts are never trusted or migrated. */
export function useClinician(): ClinicianProfile | null | "loading" {
  return useSyncExternalStore(subscribe, store.getSnapshot, () => "loading");
}

export { safeNext } from "./redirect";
