// Eye mode rules: no React, so they are testable. Two modes share one set of question screens.
//
//   Intake (the clinician's first meeting):  pain? -> where -> side -> strength -> how long -> worse when -> anything else -> review -> done
//   Conversation (ongoing):  home (Yes / No / I need something / Rest / Help) -> needs -> (Pain: where -> side -> strength -> review)
//
// Everything here is a label the clinician reads or the app says aloud; nothing is sent anywhere. English only for now.

export type EyeMode = "intake" | "conversation";
export type FlowStep = "pain_q" | "where" | "side" | "strength" | "duration" | "worse" | "other" | "review";
export type EyeScreen = "mode" | "home" | "needs" | "rest" | "help" | "done" | FlowStep;

export type FlowAnswers = {
  hurts: "yes" | "no" | null;
  where: string | null;
  side: string | null;
  strength: string | null;
  duration: string | null;
  worse: string | null;
  other: string | null;
};

export const EMPTY_ANSWERS: FlowAnswers = { hurts: null, where: null, side: null, strength: null, duration: null, worse: null, other: null };

// Same body parts and pictogram keys as the guided questions in the other modes (src/lib/mocks/data.ts).
export const WHERE_OPTIONS = [
  { id: "head", label: "Head", picto: "head", say: "head" },
  { id: "chest", label: "Chest", picto: "chest", say: "chest" },
  { id: "abdomen", label: "Stomach", picto: "abdomen", say: "stomach" },
  { id: "back", label: "Back", picto: "back", say: "back" },
  { id: "arm", label: "Arm", picto: "arm", say: "arm" },
  { id: "leg", label: "Leg", picto: "leg", say: "leg" },
] as const;

export const SIDE_OPTIONS = [
  { id: "left", label: "Left side", hint: "My left" },
  { id: "right", label: "Right side", hint: "My right" },
  { id: "both", label: "Both sides", hint: "Left and right" },
] as const;

export const STRENGTH_OPTIONS = [
  { id: "mild", label: "A little", hint: "Mild", say: "It is mild." },
  { id: "moderate", label: "Medium", hint: "Moderate", say: "It is moderate." },
  { id: "severe", label: "Strong", hint: "Severe", say: "It is severe." },
  { id: "worst", label: "The worst", hint: "Worst pain", say: "It is the worst pain." },
] as const;

export const DURATION_OPTIONS = [
  { id: "today", label: "Today", picto: "clock", say: "It started today." },
  { id: "days", label: "1–2 days", picto: "calendar", say: "It has been one to two days." },
  { id: "week", label: "About a week", picto: "calendar", say: "It has been about a week." },
  { id: "longer", label: "Longer", picto: "calendar", say: "It has been longer than a week." },
] as const;

export const WORSE_OPTIONS = [
  { id: "breathing", label: "Breathing", picto: "breath", say: "It is worse when I breathe." },
  { id: "moving", label: "Moving", picto: "move", say: "It is worse when I move." },
  { id: "eating", label: "Eating", picto: "eat", say: "It is worse when I eat." },
  { id: "nothing", label: "Nothing in particular", picto: "none", say: "" },
] as const;

export const OTHER_OPTIONS = [
  { id: "fever", label: "Fever", picto: "fever", say: "I also have a fever." },
  { id: "nausea", label: "Nausea", picto: "nausea", say: "I also feel sick to my stomach." },
  { id: "dizzy", label: "Dizziness", picto: "dizzy", say: "I also feel dizzy." },
  { id: "short_breath", label: "Short of breath", picto: "breath", say: "I also feel short of breath." },
  { id: "none", label: "Nothing else", picto: "none", say: "" },
] as const;

/** Things a patient can ask for from the conversation menu. Pain opens the question screens; the rest are said at once. */
export const NEEDS = [
  { id: "pain", label: "Pain", say: "" },
  { id: "move", label: "Move me", say: "Please help me change position." },
  { id: "water", label: "Water", say: "I would like some water." },
  { id: "toilet", label: "Toilet", say: "I need the toilet." },
  { id: "breathing", label: "Breathing", say: "I am having trouble breathing." },
  { id: "hot", label: "Too hot", say: "I am too hot." },
  { id: "cold", label: "Too cold", say: "I am too cold." },
] as const;

export function needsSide(where: string | null): boolean {
  return where === "arm" || where === "leg";
}

/** The screen after `step` once it is answered. Null means the chain is finished. */
export function nextStep(step: FlowStep, answers: FlowAnswers, mode: EyeMode): FlowStep | null {
  switch (step) {
    case "pain_q":
      return answers.hurts === "yes" ? "where" : "other";
    case "where":
      return needsSide(answers.where) ? "side" : "strength";
    case "side":
      return "strength";
    case "strength":
      return mode === "intake" ? "duration" : "review";
    case "duration":
      return "worse";
    case "worse":
      return "other";
    case "other":
      return "review";
    case "review":
      return null;
  }
}

/** The screen Back goes to; null means "back to the mode's home screen". */
export function previousStep(step: FlowStep, answers: FlowAnswers, mode: EyeMode): FlowStep | null {
  switch (step) {
    case "pain_q":
      return null;
    case "where":
      return mode === "intake" ? "pain_q" : null;
    case "side":
      return "where";
    case "strength":
      return needsSide(answers.where) ? "side" : "where";
    case "duration":
      return "strength";
    case "worse":
      return "duration";
    case "other":
      return answers.hurts === "yes" ? "worse" : "pain_q";
    case "review":
      return mode === "intake" ? "other" : "strength";
  }
}

const ORDER: (keyof FlowAnswers)[] = ["hurts", "where", "side", "strength", "duration", "worse", "other"];
const STEP_FIELD: Record<FlowStep, keyof FlowAnswers | null> = {
  pain_q: "hurts", where: "where", side: "side", strength: "strength", duration: "duration", worse: "worse", other: "other", review: null,
};

/** Answers from `step` onwards are cleared, so Back never leaves a stale later answer. */
export function clearFrom(step: FlowStep, answers: FlowAnswers): FlowAnswers {
  const field = STEP_FIELD[step];
  if (!field) return answers;
  const from = ORDER.indexOf(field);
  const next = { ...answers };
  for (const key of ORDER.slice(from)) next[key] = null;
  return next;
}

const labelOf = (list: readonly { id: string; label: string }[], id: string | null) => list.find((o) => o.id === id)?.label ?? null;

/** Short parts for the screen and the clinician: ["Pain", "Leg", "Left side", "Strong", ...]. */
export function describeAnswers(a: FlowAnswers): string[] {
  const parts = [
    a.hurts === "yes" ? "Pain" : a.hurts === "no" ? "No pain" : null,
    labelOf(WHERE_OPTIONS, a.where),
    labelOf(SIDE_OPTIONS, a.side),
    labelOf(STRENGTH_OPTIONS, a.strength),
    labelOf(DURATION_OPTIONS, a.duration),
    a.worse && a.worse !== "nothing" ? `Worse: ${labelOf(WORSE_OPTIONS, a.worse)}` : null,
    a.other && a.other !== "none" ? labelOf(OTHER_OPTIONS, a.other) : null,
  ];
  return parts.filter((p): p is string => Boolean(p));
}

/** What the app says aloud for the patient, as plain sentences. */
export function speakableSummary(a: FlowAnswers): string {
  const out: string[] = [];
  if (a.hurts === "no") out.push("I do not have pain.");
  if (a.hurts === "yes") {
    const part = WHERE_OPTIONS.find((o) => o.id === a.where)?.say;
    if (!part) out.push("I have pain.");
    else if (a.side === "left" || a.side === "right") out.push(`I have pain in my ${a.side} ${part}.`);
    else if (a.side === "both") out.push(`I have pain in my ${part}, on both sides.`);
    else out.push(`I have pain in my ${part}.`);
  }
  const say = (list: readonly { id: string; say: string }[], id: string | null) => list.find((o) => o.id === id)?.say;
  for (const sentence of [say(STRENGTH_OPTIONS, a.strength), say(DURATION_OPTIONS, a.duration), say(WORSE_OPTIONS, a.worse), say(OTHER_OPTIONS, a.other)]) {
    if (sentence) out.push(sentence);
  }
  return out.join(" ");
}
