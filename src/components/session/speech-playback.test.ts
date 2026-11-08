import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { createSpeechPlayback, selectSpeechVoice, type SpeechPlaybackState } from "./speech-playback";

const voice = (lang: string, localService = true) => ({
  lang, localService, name: `Synthetic ${lang}`, voiceURI: `fixture:${lang}:${localService}`, default: false,
} satisfies SpeechSynthesisVoice);

function fixture(t: TestContext, initialVoices: SpeechSynthesisVoice[]) {
  let voices = initialVoices;
  let cancels = 0;
  let resumes = 0;
  const spoken: SpeechSynthesisUtterance[] = [];
  const states: SpeechPlaybackState[] = [];
  const events = new EventTarget();
  const synthesis = Object.assign(events, {
    paused: false,
    getVoices: () => voices,
    cancel: () => { cancels++; },
    resume: () => { resumes++; },
    speak: (utterance: SpeechSynthesisUtterance) => { spoken.push(utterance); },
  }) as unknown as SpeechSynthesis;
  const makeUtterance = (text: string) => ({ text, voice: null, lang: "", rate: 1 }) as SpeechSynthesisUtterance;
  const playback = createSpeechPlayback(synthesis, makeUtterance, state => states.push(state));
  t.after(() => playback.dispose());
  return {
    playback, states, spoken, synthesis, makeUtterance,
    setVoices(next: SpeechSynthesisVoice[]) { voices = next; },
    changed() { events.dispatchEvent(new Event("voiceschanged")); },
    get cancels() { return cancels; },
    get resumes() { return resumes; },
  };
}

test("Safari Arabic and Mandarin voice aliases select compatible local voices", () => {
  const english = voice("en-US");
  const arabic = voice("ar_001");
  const mandarin = voice("zh_CN");
  const spanish = voice("es-MX");
  const voices = [english, voice("ar-SA", false), voice("zh-CN", false), voice("zh-HK"), arabic, mandarin, spanish];
  for (const [language, expected] of [["ar-SA", arabic], ["zh-Hans", mandarin], ["zh-CN", mandarin], ["en-US", english], ["es-ES", spanish]] as const) {
    assert.equal(selectSpeechVoice(voices, language), expected);
  }
  assert.equal(selectSpeechVoice([voice("zh-TW")], "zh-CN")?.lang, "zh-TW");
  assert.equal(selectSpeechVoice([voice("ar-EG")], "ar-SA")?.lang, "ar-EG");
  assert.equal(selectSpeechVoice([voice("en-US"), voice("yue-HK"), voice("zh-HK"), voice("zh-MO")], "zh-CN"), undefined);
  assert.equal(selectSpeechVoice([voice("zh-wuu")], "zh-CN"), undefined);
  assert.equal(selectSpeechVoice([voice("cmn-CN")], "zh-Hans")?.lang, "cmn-CN");
  assert.equal(selectSpeechVoice([english], "ar-SA"), undefined);
  assert.equal(selectSpeechVoice([voice("es-ES", false)], "es-ES")?.localService, false);
});

test("read-aloud sets an explicit voice and its matching locale without changing synthetic text", (t) => {
  const f = fixture(t, [voice("en-US"), voice("ar_001"), voice("zh_CN")]);
  for (const [text, language, expected] of [["أحتاج إلى الماء.", "ar-SA", "ar-001"], ["请给我水。", "zh-Hans", "zh-CN"]]) {
    f.playback.speak(text, language);
    const spoken = f.spoken.at(-1)!;
    assert.ok(spoken.voice);
    assert.equal(spoken.lang, expected);
    assert.equal(spoken.text, text);
    assert.equal(f.states.at(-1)?.speaking, true);
    spoken.onend?.({} as SpeechSynthesisEvent);
    assert.deepEqual(f.states.at(-1), { speaking: false, status: null });
  }
});

test("missing language voices fail explicitly instead of using the English default", (t) => {
  const f = fixture(t, [voice("en-US")]);
  f.playback.speak("请给我水。", "zh-CN");
  assert.equal(f.spoken.length, 0);
  assert.deepEqual(f.states.at(-1), { speaking: false, status: "voice-unavailable" });
});

test("delayed voice discovery requests another user tap rather than speaking outside a gesture", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture(t, []);
  f.playback.speak("请给我水。", "zh-CN");
  assert.equal(f.states.at(-1)?.status, "loading-voices");
  f.setVoices([voice("zh-CN")]);
  f.changed();
  assert.equal(f.states.at(-1)?.status, "voice-ready");
  assert.equal(f.spoken.length, 0);
  t.mock.timers.tick(2000);
  assert.equal(f.states.at(-1)?.status, "voice-ready");
  f.playback.speak("请给我水。", "zh-CN");
  assert.equal(f.spoken.length, 1);
});

test("empty voice discovery has a bounded wait and can be retried after voices become available", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture(t, []);
  f.playback.speak("أحتاج إلى الماء.", "ar-SA");
  t.mock.timers.tick(1500);
  assert.equal(f.states.at(-1)?.status, "voice-unavailable");
  f.setVoices([voice("ar-001")]);
  f.playback.speak("أحتاج إلى الماء.", "ar-SA");
  assert.equal(f.spoken[0].voice?.lang, "ar-001");
});

test("playback errors and exceptions are visible without returning utterance content", (t) => {
  const f = fixture(t, [voice("zh-CN")]);
  f.playback.speak("请给我水。", "zh-CN");
  f.spoken[0].onerror?.({ error: "language-unavailable" } as SpeechSynthesisErrorEvent);
  assert.deepEqual(f.states.at(-1), { speaking: false, status: "playback-failed" });
  f.synthesis.speak = () => { throw new Error("Synthetic speech failure"); };
  f.playback.speak("请给我水。", "zh-CN");
  assert.deepEqual(f.states.at(-1), { speaking: false, status: "playback-failed" });
});

test("a browser that never starts playback reports failure; a started utterance is not timed out", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture(t, [voice("en-US")]);
  f.playback.speak("Please give me water.", "en-US");
  t.mock.timers.tick(10000);
  assert.equal(f.states.at(-1)?.status, "playback-failed");
  f.playback.speak("Please give me water.", "en-US");
  f.spoken.at(-1)!.onstart?.({} as SpeechSynthesisEvent);
  t.mock.timers.tick(10000);
  assert.equal(f.states.at(-1)?.speaking, true);
});

test("new playback and unmount cannot let old callbacks or idle controls cancel the active voice", (t) => {
  const f = fixture(t, [voice("en-US")]);
  const otherStates: SpeechPlaybackState[] = [];
  const other = createSpeechPlayback(f.synthesis, f.makeUtterance, state => otherStates.push(state));
  t.after(() => other.dispose());
  f.playback.speak("Please give me water.", "en-US");
  const oldError = f.spoken[0].onerror!;
  other.speak("Please wait.", "en-US");
  assert.equal(f.states.at(-1)?.speaking, false);
  const before = f.cancels;
  f.playback.dispose();
  oldError.call(f.spoken[0], { error: "interrupted" } as SpeechSynthesisErrorEvent);
  assert.equal(f.cancels, before);
  assert.equal(otherStates.at(-1)?.speaking, true);
  other.dispose();
  assert.equal(f.cancels, before + 1);
});

test("disposing pending voice discovery prevents delayed callbacks; paused engines resume on press", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture(t, []);
  f.playback.speak("Please wait.", "en-US");
  f.playback.dispose();
  const states = f.states.length;
  f.setVoices([voice("en-US")]);
  f.changed();
  t.mock.timers.tick(2000);
  assert.equal(f.states.length, states);
  const other = fixture(t, [voice("es-ES")]);
  Object.defineProperty(other.synthesis, "paused", { value: true });
  other.playback.speak("Por favor, espere.", "es-ES");
  assert.equal(other.resumes, 1);
});

test("session reset clears feedback and pending discovery before a new language/session", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture(t, []);
  f.playback.speak("请给我水。", "zh-CN");
  f.playback.stop();
  assert.deepEqual(f.states.at(-1), { speaking: false, status: null });
  f.setVoices([voice("zh-CN")]);
  f.changed();
  t.mock.timers.tick(2000);
  assert.deepEqual(f.states.at(-1), { speaking: false, status: null });
  f.playback.speak("Please wait.", "en-US");
  assert.equal(f.states.at(-1)?.status, "voice-unavailable");
  f.playback.stop();
  assert.equal(f.states.at(-1)?.status, null);
});
