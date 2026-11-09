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

// Speech lifecycle regressions: fixed synthetic metadata, no camera/network/audio device.
import { publicSpeechCatalog } from "../questions/speech-catalog";
import { EYE_LANGUAGES, eyeSummary, eyeSpeechSegments, localizeEyeSpeech } from "../questions/eye-localization";
import { publicSpeechPlaylist } from "../../components/session/cloud-speech";

const clips = publicSpeechCatalog().map((entry, index) => ({ ...entry, src: `/speech/${entry.language}-${index.toString(16).padStart(64, "0")}.mp3` }));
class FakeAudio {
  static nextBlocked = false;
  constructor() { this.blocked = FakeAudio.nextBlocked; FakeAudio.nextBlocked = false; }
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  plays = 0;
  pauses = 0;
  blocked = false;
  play() { this.plays++; return this.blocked ? Promise.reject(Object.assign(new Error(), { name: "NotAllowedError" })) : Promise.resolve(); }
  pause() { this.pauses++; }
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
async function withEyeSpeech(run: (speech: { audio: FakeAudio[]; utterances: SpeechSynthesisUtterance[]; cancelled: () => number }) => Promise<void>) {
  const names = ["window", "Audio", "fetch", "SpeechSynthesisUtterance"] as const;
  const old = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const audio: FakeAudio[] = [];
  const utterances: SpeechSynthesisUtterance[] = [];
  let cancels = 0;
  class Audio extends FakeAudio { constructor() { super(); audio.push(this); } }
  class Utterance {
    constructor(public text: string) {}
    lang = ""; rate = 1; voice: SpeechSynthesisVoice | null = null;
    onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
  }
  const fetcher = (async (url: string) => new Response(JSON.stringify(url.includes("manifest") ? { schemaVersion: 1, clips } : { provider: "azure" }), { headers: { "Content-Type": "application/json" } })) as typeof fetch;
  const values = [{ Audio, fetch: fetcher, speechSynthesis: {
    getVoices: () => ["en-US", "es-ES", "ar-SA", "zh-CN"].map(lang => ({ lang, localService: true } as SpeechSynthesisVoice)),
    cancel: () => { cancels++; }, speak: (utterance: SpeechSynthesisUtterance) => utterances.push(utterance),
  } }, Audio, fetcher, Utterance];
  names.forEach((name, index) => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: values[index] }));
  try { eye.clear(); await run({ audio, utterances, cancelled: () => cancels }); }
  finally {
    eye.clear();
    names.forEach((name, index) => { const descriptor = old[index]; if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); });
  }
}

test("Eye summaries in all languages resolve complete Azure playlists without losing side, severity or negation", () => {
  for (const language of EYE_LANGUAGES) {
    for (const where of ["head", "chest", "abdomen", "back", "arm", "leg"]) {
      for (const side of (where === "arm" || where === "leg" ? [null, "left", "right", "both"] : [null])) {
        for (const strength of ["mild", "moderate", "severe", "worst"]) {
          const summary = eyeSummary(a({ hurts: "yes", where, side, strength, duration: "days", worse: "moving", other: "fever" }), language);
          assert.ok(summary);
          assert.equal(eyeSpeechSegments(summary, language)?.length, 5);
          assert.equal(publicSpeechPlaylist(summary, language, clips)?.length, 5);
        }
      }
    }
    for (const [field, choices] of Object.entries({ duration: ["today", "days", "week", "longer"], worse: ["breathing", "moving", "eating", "nothing"], other: ["fever", "nausea", "dizzy", "short_breath", "none"] })) {
      for (const choice of choices) {
        const summary = eyeSummary(a({ hurts: "yes", where: "arm", side: "both", [field]: choice }), language);
        const playlist = publicSpeechPlaylist(summary, language, clips);
        assert.ok(playlist?.length);
        assert.equal(playlist.length, choice === "nothing" || choice === "none" ? 1 : 2);
      }
    }
    const noPain = eyeSummary(a({ hurts: "no", other: "none" }), language);
    assert.equal(publicSpeechPlaylist(noPain, language, clips)?.length, 1);
    assert.notEqual(noPain, eyeSummary(a({ hurts: "yes" }), language));
    const help = localizeEyeSpeech("I need help. Please come now.", language)!;
    assert.equal(publicSpeechPlaylist(help, language, clips)?.length, 1);
    assert.equal(eyeSpeechSegments(`${help} unknown`, language), undefined);
  }
});

test("Clearing Eye during pending manifest loading cannot start late audio", async () => {
  await withEyeSpeech(async ({ audio, utterances }) => {
    eye.setLanguage("es"); eye.say("Yes.");
    assert.equal(getEyeState().speechStatus, "queued");
    eye.clear();
    await tick();
    assert.equal(audio.length, 0);
    assert.equal(utterances.length, 0);
    assert.equal(getEyeState().speechStatus, "idle");
  });
});

test("Eye choices use static Azure audio in every language, only finishing after the final segment", async () => {
  await withEyeSpeech(async ({ audio, utterances }) => {
    for (const language of EYE_LANGUAGES) {
      eye.setLanguage(language);
      eye.say("I have pain in my left leg. It is severe.");
      await tick();
      const current = audio.at(-1)!;
      assert.ok(current.src.startsWith(`/speech/${language}-`));
      assert.equal(getEyeState().speechStatus, "speaking");
      current.onended?.();
      assert.equal(getEyeState().speechStatus, "speaking");
      current.onended?.();
      assert.equal(getEyeState().speechStatus, "spoken");
      assert.equal(getEyeState().lastSaid, localizeEyeSpeech("I have pain in my left leg. It is severe.", language));
    }
    assert.equal(utterances.length, 0);
  });
});

test("Eye mute, supersession, Help exit and clear cancel audio and reject late callbacks", async () => {
  await withEyeSpeech(async ({ audio }) => {
    eye.setLanguage("ar");
    eye.setMuted(true);
    eye.say("I need help. Please come now.", true);
    await tick();
    assert.equal(audio.length, 0);
    assert.equal(getEyeState().speechStatus, "muted");
    assert.equal(getEyeState().log[0].help, true);
    eye.setMuted(false);
    eye.start("conversation"); eye.go("help"); eye.say("I need help. Please come now.", true);
    await tick();
    const help = audio.at(-1)!;
    const lateHelp = help.onended;
    eye.go("home");
    assert.ok(help.pauses);
    assert.equal(getEyeState().speechStatus, "stopped");
    lateHelp?.();
    assert.equal(getEyeState().speechStatus, "stopped");
    eye.say("Yes."); await tick();
    const yes = audio.at(-1)!;
    const lateYes = yes.onended;
    eye.say("No."); await tick();
    lateYes?.();
    assert.equal(getEyeState().speechStatus, "speaking");
    eye.clear();
    audio.at(-1)?.onended?.();
    assert.equal(getEyeState().language, "en");
    assert.equal(getEyeState().lastSaid, null);
    assert.equal(getEyeState().lastIntake, null);
    assert.equal(getEyeState().intake, null);
    assert.deepEqual(getEyeState().answers, EMPTY_ANSWERS);
    assert.deepEqual(getEyeState().log, []);
    assert.equal(getEyeState().mode, null);
    assert.equal(getEyeState().speechStatus, "idle");
  });
});

test("Eye language changes clear the previous flow while same-language handoff preserves it", async () => {
  await withEyeSpeech(async () => {
    eye.setLanguage("es-MX"); eye.start("intake"); eye.say("Yes."); await tick();
    eye.setLanguage("es");
    assert.equal(getEyeState().mode, "intake");
    eye.setLanguage("zh-Hans");
    assert.equal(getEyeState().language, "zh-Hans");
    assert.equal(getEyeState().mode, null);
    assert.equal(getEyeState().lastSaid, null);
    assert.deepEqual(getEyeState().log, []);
    eye.setLanguage("yue-HK");
    assert.equal(getEyeState().language, "en");
  });
});

test("Eye audio failure offers explicit device fallback; blocked audio can retry without recording another choice", async () => {
  await withEyeSpeech(async ({ audio, utterances }) => {
    FakeAudio.nextBlocked = true;
    eye.say("Yes."); await tick();
    const current = audio.at(-1)!;
    assert.equal(getEyeState().speechStatus, "audio-ready");
    const count = getEyeState().log.length;
    current.blocked = false;
    eye.repeat(); await tick();
    assert.equal(current.plays, 2);
    assert.equal(getEyeState().log.length, count);
    current.onerror?.();
    assert.equal(getEyeState().speechStatus, "browser-ready");
    assert.equal(utterances.length, 0);
    eye.repeat();
    assert.equal(utterances.length, 1);
    utterances[0].onstart?.({} as SpeechSynthesisEvent);
    assert.equal(getEyeState().speechStatus, "speaking");
    utterances[0].onend?.({} as SpeechSynthesisEvent);
    assert.equal(getEyeState().speechStatus, "spoken");
  });
});


test("Eye replay rebuilds disposed audio after stop, remount, mute and mode changes without recording choices", async () => {
  await withEyeSpeech(async ({ audio, utterances }) => {
    eye.setLanguage("ar"); eye.start("conversation"); eye.say("I would like some water."); await tick();
    const expected = getEyeState().lastSaid;
    const log = getEyeState().log;
    const stopped = audio.at(-1)!;
    const lateEnd = stopped.onended;
    eye.stopSpeech(); // Same teardown used by unmount and handoff.
    assert.equal(stopped.src, "");
    eye.repeat(); await tick();
    const repeated = audio.at(-1)!;
    assert.notEqual(repeated, stopped);
    assert.ok(repeated.src.startsWith("/speech/ar-"));
    assert.equal(getEyeState().lastSaid, expected);
    assert.equal(getEyeState().log, log);
    lateEnd?.();
    assert.equal(getEyeState().speechStatus, "speaking");
    eye.setMuted(true);
    const count = audio.length;
    eye.repeat(); await tick();
    assert.equal(audio.length, count);
    eye.setMuted(false); eye.repeat(); await tick();
    assert.equal(audio.length, count + 1);
    assert.equal(getEyeState().log, log);
    eye.start("intake"); eye.repeat(); await tick();
    assert.ok(audio.at(-1)!.src.startsWith("/speech/ar-"));
    assert.equal(getEyeState().log, log);
    // Rebuilt controllers preserve explicit browser fallback and the locale.
    audio.at(-1)!.onerror?.();
    assert.equal(getEyeState().speechStatus, "browser-ready");
    eye.repeat();
    assert.equal(utterances.at(-1)!.lang, "ar-SA");
    eye.stopSpeech();
    assert.equal(utterances.at(-1)!.onend, null);
    eye.repeat(); await tick();
    assert.equal(getEyeState().speechStatus, "speaking");
    eye.clear();
    const afterClear = audio.length;
    eye.repeat(); await tick();
    assert.equal(audio.length, afterClear);
    assert.equal(getEyeState().lastSaid, null);
    assert.equal(getEyeState().speechStatus, "idle");
  });
});

test("Eye replay of a choice first selected while muted retains its language without a duplicate event", async () => {
  await withEyeSpeech(async ({ audio }) => {
    eye.setLanguage("zh-Hans"); eye.setMuted(true); eye.say("No.");
    const log = getEyeState().log;
    eye.setMuted(false); eye.repeat(); await tick();
    assert.ok(audio.at(-1)!.src.startsWith("/speech/zh-Hans-"));
    assert.equal(getEyeState().log, log);
    assert.equal(getEyeState().speechStatus, "speaking");
  });
});
