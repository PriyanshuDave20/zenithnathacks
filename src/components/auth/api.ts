"use client";

// The only place the UI talks to clinician accounts. Today it calls the frontend mock (src/lib/mocks/auth.ts);
// Backend 1 swaps each function for its real route (docs/API.md "Clinician accounts") and keeps the shapes.
import { useSyncExternalStore } from "react";
import { eye } from "@/lib/eye/session";
import { setGazeAvailable } from "@/components/input/gaze/gaze-availability";
import {
  getSessionSnapshot,
  mockRequestPasswordReset,
  mockSignIn,
  mockSignInWithGoogle,
  mockSignOut,
  mockSignUp,
  mockUpdateProfile,
  subscribeSession,
  type ClinicianProfile,
} from "@/lib/mocks/auth";

export type { AuthError, ClinicianProfile, ClinicianRole } from "@/lib/mocks/auth";

export const USING_MOCK_AUTH = true;

function clearPatientSession() {
  eye.clear();
  setGazeAvailable(false);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("synapse:gaze-stop"));
}

export async function signUp(...args: Parameters<typeof mockSignUp>) {
  const profile = await mockSignUp(...args);
  clearPatientSession();
  return profile;
}
export async function signIn(...args: Parameters<typeof mockSignIn>) {
  const profile = await mockSignIn(...args);
  clearPatientSession();
  return profile;
}
export async function signInWithGoogle() {
  const profile = await mockSignInWithGoogle();
  clearPatientSession();
  return profile;
}
export const requestPasswordReset = mockRequestPasswordReset;
export const updateProfile = mockUpdateProfile;
export async function signOut() {
  clearPatientSession();
  await mockSignOut();
}

/** "loading" during server render and hydration, then the signed-in clinician or null. */
export function useClinician(): ClinicianProfile | null | "loading" {
  return useSyncExternalStore<ClinicianProfile | null | "loading">(subscribeSession, getSessionSnapshot, () => "loading");
}

/** Only allow same-site relative paths as post-sign-in destinations. */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard") {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}
