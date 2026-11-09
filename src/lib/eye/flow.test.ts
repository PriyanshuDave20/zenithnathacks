import assert from "node:assert/strict";
import test from "node:test";
import { clearFrom, describeAnswers, describeRows, EMPTY_ANSWERS, nextStep, previousStep, speakableSummary, type FlowAnswers } from "./flow";
import { eye, getEyeState } from "./session";

const a = (extra: Partial<FlowAnswers> = {}): FlowAnswers => ({ ...EMPTY_ANSWERS, ...extra });

test("conversation pain: where, side for arm and leg only, strength, then review", () => {
  assert.equal(nextStep("where", a({ hurts: "yes", where: "abdomen" }), "conversation"), "strength");
  assert.equal(nextStep("where", a({ hurts: "yes", where: "leg" }), "conversation"), "side");
  assert.equal(nextStep("side", a({ where: "leg", side: "left" }), "conversation"), "strength");
  assert.equal(nextStep("strength", a(), "conversation"), "review");
  assert.equal(nextStep("review", a(), "conversation"), null);
});

test("intake keeps going: how long, worse when, anything else, review", () => {
  assert.equal(nextStep("pain_q", a({ hurts: "yes" }), "intake"), "where");
  assert.equal(nextStep("pain_q", a({ hurts: "no" }), "intake"), "other");
  assert.equal(nextStep("strength", a(), "intake"), "duration");
  assert.equal(nextStep("duration", a(), "intake"), "worse");
  assert.equal(nextStep("worse", a(), "intake"), "other");
  assert.equal(nextStep("other", a(), "intake"), "review");
});

test("back mirrors forward in both modes", () => {
  assert.equal(previousStep("pain_q", a(), "intake"), null);
  assert.equal(previousStep("where", a(), "conversation"), null);
  assert.equal(previousStep("where", a(), "intake"), "pain_q");
  assert.equal(previousStep("strength", a({ where: "arm" }), "intake"), "side");
  assert.equal(previousStep("strength", a({ where: "back" }), "intake"), "where");
  assert.equal(previousStep("other", a({ hurts: "no" }), "intake"), "pain_q");
  assert.equal(previousStep("other", a({ hurts: "yes" }), "intake"), "worse");
  assert.equal(previousStep("review", a(), "conversation"), "strength");
  assert.equal(previousStep("review", a(), "intake"), "other");
});

test("going back clears this answer and everything after it", () => {
  const all = a({ hurts: "yes", where: "leg", side: "left", strength: "severe", duration: "days", worse: "moving", other: "fever" });
  assert.deepEqual(clearFrom("strength", all), a({ hurts: "yes", where: "leg", side: "left" }));
  assert.deepEqual(clearFrom("where", all), a({ hurts: "yes" }));
  assert.deepEqual(clearFrom("pain_q", all), EMPTY_ANSWERS);
  assert.deepEqual(clearFrom("review", all), all);
});

test("the clinician summary lists parts in order and skips 'nothing' answers", () => {
  assert.deepEqual(
    describeAnswers(a({ hurts: "yes", where: "leg", side: "left", strength: "severe", duration: "days", worse: "moving", other: "fever" })),
    ["Pain", "Leg", "Left side", "Strong", "1–2 days", "Worse: Moving", "Fever"],
  );
  assert.deepEqual(describeAnswers(a({ hurts: "no", other: "none" })), ["No pain"]);
});

test("the spoken summary reads as plain sentences", () => {
  assert.equal(
    speakableSummary(a({ hurts: "yes", where: "leg", side: "left", strength: "severe", worse: "moving" })),
    "I have pain in my left leg. It is severe. It is worse when I move.",
  );
  assert.equal(speakableSummary(a({ hurts: "yes", where: "abdomen", strength: "mild" })), "I have pain in my stomach. It is mild.");
  assert.equal(speakableSummary(a({ hurts: "no", other: "none" })), "I do not have pain.");
  assert.equal(speakableSummary(a({ hurts: "yes", where: "arm", side: "both" })), "I have pain in my arm, on both sides.");
});

test("the clinician rows are labelled and only include what was answered", () => {
  assert.deepEqual(describeRows(a({ hurts: "yes", where: "arm", side: "right", strength: "mild" })), [
    { label: "Pain", value: "Yes" },
    { label: "Where", value: "Arm" },
    { label: "Side", value: "Right side" },
    { label: "How strong", value: "A little" },
  ]);
  assert.deepEqual(describeRows(EMPTY_ANSWERS), []);
});

// Speech lifecycle regressions: no camera, audio device or network is used.
function withEyeSpeech(run: (speech: { utterances: SpeechSynthesisUtterance[]; cancelled: () => number }) => void) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldUtterance = Object.getOwnPropertyDescriptor(globalThis, "SpeechSynthesisUtterance");
  const utterances: SpeechSynthesisUtterance[] = [];
  let cancels = 0;
  class Utterance {
    constructor(public text: string) {}
    lang = "";
    rate = 1;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    speechSynthesis: { cancel: () => { cancels++; }, speak: (utterance: SpeechSynthesisUtterance) => utterances.push(utterance) },
  } });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { configurable: true, value: Utterance });
  try {
    eye.clear();
    run({ utterances, cancelled: () => cancels });
  } finally {
    eye.clear();
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldUtterance) Object.defineProperty(globalThis, "SpeechSynthesisUtterance", oldUtterance);
    else Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
  }
}

function speechEvent(utterance: SpeechSynthesisUtterance, type: "start" | "end" | "error") {
  const callback = utterance[`on${type}`];
  if (callback) Reflect.apply(callback, utterance, [{}]);
}

test("Eye speech only reports completion after playback, and superseded callbacks cannot change the next choice", () => {
  withEyeSpeech(({ utterances }) => {
    eye.say("Yes.");
    assert.equal(getEyeState().speechStatus, "queued");
    speechEvent(utterances[0], "start");
    assert.equal(getEyeState().speechStatus, "speaking");
    eye.say("No.");
    speechEvent(utterances[0], "end");
    assert.equal(getEyeState().speechStatus, "queued");
    assert.equal(getEyeState().lastSaid, "No.");
    speechEvent(utterances[1], "start");
    speechEvent(utterances[1], "end");
    assert.equal(getEyeState().speechStatus, "spoken");
  });
});

test("Eye muted, unavailable and failed speech retain the choice without claiming playback", () => {
  withEyeSpeech(({ utterances }) => {
    eye.setMuted(true);
    eye.say("I need help.", true);
    assert.equal(utterances.length, 0);
    assert.equal(getEyeState().speechStatus, "muted");
    assert.equal(getEyeState().log[0].help, true);
    eye.setMuted(false);
    assert.equal(getEyeState().speechStatus, "muted");
    eye.say("Yes.");
    speechEvent(utterances[0], "error");
    assert.equal(getEyeState().speechStatus, "error");
    window.speechSynthesis.speak = () => { throw new Error("Speech unavailable"); };
    eye.say("No.");
    assert.equal(getEyeState().speechStatus, "error");
    Reflect.deleteProperty(window, "speechSynthesis");
    eye.say("I would like water.");
    assert.equal(getEyeState().speechStatus, "unavailable");
    assert.equal(getEyeState().lastSaid, "I would like water.");
  });
});

test("Leaving Eye Help cancels current speech; clearing removes all session content and ignores late callbacks", () => {
  withEyeSpeech(({ utterances, cancelled }) => {
    eye.start("conversation");
    eye.go("help");
    eye.say("I need help.", true);
    speechEvent(utterances[0], "start");
    const before = cancelled();
    eye.go("home");
    assert.ok(cancelled() > before);
    assert.equal(getEyeState().speechStatus, "stopped");
    speechEvent(utterances[0], "end");
    assert.equal(getEyeState().speechStatus, "stopped");
    eye.say("I would like water.");
    eye.answers(a({ where: "head" }));
    eye.finishIntake(a({ where: "head" }), "Head");
    eye.clear();
    speechEvent(utterances[1], "end");
    assert.equal(getEyeState().lastSaid, null);
    assert.equal(getEyeState().lastIntake, null);
    assert.equal(getEyeState().intake, null);
    assert.deepEqual(getEyeState().answers, EMPTY_ANSWERS);
    assert.deepEqual(getEyeState().log, []);
    assert.equal(getEyeState().mode, null);
    assert.equal(getEyeState().speechStatus, "idle");
  });
});
