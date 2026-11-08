// The Eye mode conversation: a short chain of big, one-choice screens so a person who can only look
// can say what they mean and reach a clear end. Pure data and rules (no React) so they are testable.
//
//   board -> confirm -> (Pain only) where -> side (arm, leg) -> strength -> review -> hand to clinician
//
// Every answer here is a label the clinician reads; nothing is sent anywhere. English only for now (the Eye
// board has no patient language yet), like the rest of this board.

export type FlowStep = "root" | "confirm" | "where" | "side" | "strength" | "review";

export type FlowAnswers = {
  option: string | null; // a board choice: yes, no, pain, help, reposition, pause
  where: string | null;
  side: string | null;
  strength: string | null;
};

export const EMPTY_ANSWERS: FlowAnswers = { option: null, where: null, side: null, strength: null };

// Same body parts and pictogram keys as the guided questions in the other modes (src/lib/mocks/data.ts "where").
export const WHERE_OPTIONS = [
  { id: "head", label: "Head", picto: "head" },
  { id: "chest", label: "Chest", picto: "chest" },
  { id: "abdomen", label: "Stomach", picto: "abdomen" },
  { id: "back", label: "Back", picto: "back" },
  { id: "arm", label: "Arm", picto: "arm" },
  { id: "leg", label: "Leg", picto: "leg" },
] as const;

export const SIDE_OPTIONS = [
  { id: "left", label: "Left side", hint: "My left" },
  { id: "right", label: "Right side", hint: "My right" },
  { id: "both", label: "Both sides", hint: "Left and right" },
] as const;

export const STRENGTH_OPTIONS = [
  { id: "mild", label: "A little", hint: "Mild" },
  { id: "moderate", label: "Medium", hint: "Moderate" },
  { id: "severe", label: "Strong", hint: "Severe" },
  { id: "worst", label: "The worst", hint: "Worst pain" },
] as const;

const ROOT_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  pain: "Pain",
  help: "Help",
  reposition: "Move me",
  pause: "Take a break",
};

/** Body parts that come in a left and a right. */
export function needsSide(where: string | null): boolean {
  return where === "arm" || where === "leg";
}

/** Only Pain has follow-up questions; every other choice ends after it is confirmed. */
export function followUps(option: string | null): boolean {
  return option === "pain";
}

/** The screen after `step` once the person answers it (confirm: Yes). Null means the chain is finished. */
export function nextStep(step: FlowStep, answers: FlowAnswers): FlowStep | null {
  switch (step) {
    case "root":
      return "confirm";
    case "confirm":
      return followUps(answers.option) ? "where" : null;
    case "where":
      return needsSide(answers.where) ? "side" : "strength";
    case "side":
      return "strength";
    case "strength":
      return "review";
    case "review":
      return null;
  }
}

/** The screen Back goes to. */
export function previousStep(step: FlowStep, answers: FlowAnswers): FlowStep {
  switch (step) {
    case "root":
    case "confirm":
      return "root";
    case "where":
      return "confirm";
    case "side":
      return "where";
    case "strength":
      return needsSide(answers.where) ? "side" : "where";
    case "review":
      return "strength";
  }
}

/** A step's answers cleared from here on, so going Back never leaves a stale later answer. */
export function clearFrom(step: FlowStep, answers: FlowAnswers): FlowAnswers {
  const next = { ...answers };
  if (step === "root" || step === "confirm") return { ...EMPTY_ANSWERS };
  if (step === "where") return { ...next, where: null, side: null, strength: null };
  if (step === "side") return { ...next, side: null, strength: null };
  return { ...next, strength: null };
}

const labelOf = (list: readonly { id: string; label: string }[], id: string | null) =>
  list.find((o) => o.id === id)?.label ?? null;

/** What the patient said, in order, as short parts: ["Pain", "Stomach", "Left side", "Strong"]. */
export function describeAnswers(a: FlowAnswers): string[] {
  const parts = [a.option ? (ROOT_LABELS[a.option] ?? a.option) : null, labelOf(WHERE_OPTIONS, a.where), labelOf(SIDE_OPTIONS, a.side), labelOf(STRENGTH_OPTIONS, a.strength)];
  return parts.filter((p): p is string => Boolean(p));
}

export function rootLabel(id: string | null): string | null {
  return id ? (ROOT_LABELS[id] ?? null) : null;
}
