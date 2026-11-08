// Draft types mirroring docs/API.md exactly. The source of truth will be the zod schemas in
// src/lib/contracts/ (Backend 1's first shared PR). When those land, import the real types and
// delete this file; the UI only depends on these names.

export type Mode = "standard" | "deaf_hoh" | "low_literacy" | "mute" | "icu";
export type Language = string; // BCP-47, e.g. "en", "es", "ar", "zh-Hans"
export type ReadingLevel = 1 | 2 | 3 | 4 | 5;

export type PatientContext = {
  language: Language;
  mode: Mode;
  readingLevel: ReadingLevel; // default 3
};

export type TranslateInput = {
  questionId?: string; // set for guided answers; absent for free-form speech or text
  kind: "text" | "speech_transcript" | "pictogram" | "option";
  value: string; // text, transcript, pictogram id, or option id
};

export type TranslateRequest = {
  context: PatientContext;
  inputs: TranslateInput[];
};

export type TranslateResponse = {
  original: string;
  translated: string;
  backTranslation: string;
  summary: {
    chiefComplaint: string;
    symptoms: string[];
    duration?: string;
    redFlags: string[];
  };
  lowConfidence: { phrase: string; reason: string }[];
  redactions: number;
};

export type RespondRequest = { context: PatientContext; message: string };

export type RespondResponse = {
  patientText: string;
  readAloudText: string;
  teachBackPrompt: string;
};

export type MetricsEvent = {
  event: "session_started" | "first_message" | "teachback_confirmed";
  mode: Mode;
  msSinceStart?: number;
};

export type ApiError = { error: { code: string; message: string } };

// Question bank (docs/API.md, "Question bank"). RegionId comes from src/lib/contracts/input.ts.
import type { RegionId } from "@/lib/contracts/input";

export type QuestionOption = {
  id: string;
  label: string; // English label sent to the clinician
  pictogram?: string;
  text: Record<Language, string>;
};

export type Question = {
  id: string;
  text: Record<Language, string>;
  options: QuestionOption[];
  followsRegion?: RegionId;
};
