"use client";

// The only place the UI talks to clinician accounts. Today it calls the frontend mock (src/lib/mocks/auth.ts);
// Backend 1 swaps each function for its real route (docs/API.md "Clinician accounts") and keeps the shapes.
import { useSyncExternalStore } from "react";
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

export const signUp = mockSignUp;
export const signIn = mockSignIn;
export const signInWithGoogle = mockSignInWithGoogle;
export const requestPasswordReset = mockRequestPasswordReset;
export const updateProfile = mockUpdateProfile;
export const signOut = mockSignOut;

/** "loading" during server render and hydration, then the signed-in clinician or null. */
export function useClinician(): ClinicianProfile | null | "loading" {
  return useSyncExternalStore<ClinicianProfile | null | "loading">(subscribeSession, getSessionSnapshot, () => "loading");
}

/** Only allow same-site relative paths as post-sign-in destinations. */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard") {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}
