import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import type { TranslateInput } from "../../lib/contracts";
import { publicSpeechCatalog } from "../../lib/questions/speech-catalog";
import { guidedPack, resolveGuided, summarizeGuided } from "../../lib/server/translate/guided";
import { createCloudSpeech, publicSpeechClip, publicSpeechPlaylist, type SpeechMetadata } from "./cloud-speech";
import type { SpeechPlaybackState } from "./speech-playback";

function fixture(provider: SpeechMetadata["provider"] = "azure") {
  const states: SpeechPlaybackState[] = [];
  let calls = 0;
  let localCalls = 0;
  const localTexts: string[] = [];
  let plays = 0;
  let revocations = 0;
  let resolve: (response: Response) => void = () => {};
  let signal: AbortSignal | null | undefined;
  let blocked = false;
  const clips: SpeechMetadata["clips"] = [];
  const audio = { src: "", onended: null as HTMLAudioElement["onended"], onerror: null as HTMLAudioElement["onerror"], pause() {},
    play() { plays++; return blocked ? Promise.reject(new DOMException("blocked", "NotAllowedError")) : Promise.resolve(); } };
  const playback = createCloudSpeech({ speak(text) { localCalls++; localTexts.push(text); }, stop() {}, dispose() {} }, state => states.push(state), {
    fetch: ((_: unknown, init: RequestInit) => { calls++; signal = init.signal; return new Promise<Response>(done => { resolve = done; }); }) as typeof fetch,
    makeAudio: () => audio, createUrl: () => "blob:synthetic", revokeUrl() { revocations++; }, metadata: () => ({ provider, clips }),
  });
  return { playback, audio, states, clips, localTexts, get calls() { return calls; }, get localCalls() { return localCalls; }, get plays() { return plays; }, get revocations() { return revocations; }, get signal() { return signal; }, resolve: (response: Response) => resolve(response), block: () => { blocked = true; }, unblock: () => { blocked = false; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const mp3 = () => new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });
const manifest: { clips: SpeechMetadata["clips"] } = JSON.parse(readFileSync("public/speech/manifest.json", "utf8"));
const guidedInputs: TranslateInput[] = [
  { questionId: "where", kind: "option", value: "left_upper_arm" },
  { questionId: "where", kind: "option", value: "chest" },
  { questionId: "how_long", kind: "option", value: "days" },
  { questionId: "how_strong", kind: "option", value: "s4" },
  { questionId: "aggravating_factors", kind: "option", value: "breathing" },
  { questionId: "associated_symptoms", kind: "option", value: "none" },
];
function guidedReadBack(language = "es", inputs = guidedInputs) {
  const pack = guidedPack(language);
  return summarizeGuided(inputs.map(input => resolveGuided(input, pack)), pack).backTranslation;
}
function guidedFixture() {
  const f = fixture();
  f.clips.push(...manifest.clips);
  return f;
}
function end(f: ReturnType<typeof fixture>) {
  f.audio.onended?.call(f.audio as unknown as HTMLMediaElement, {} as Event);
}

test("browser default and uncached guided wording never post content to the cloud", () => {
  for (const provider of ["browser", "azure"] as const) {
    const f = fixture(provider);
    f.playback.speak("Where does it hurt?", "en", { kind: "public" });
    assert.equal(f.calls, 0); assert.equal(f.localCalls, 1); f.playback.dispose();
  }
  const f = fixture("browser"); f.playback.speak("Please wait.", "en");
  assert.equal(f.calls, 0); assert.equal(f.localCalls, 1); f.playback.dispose();
});

test("public clips require exact current public text, ID, language and local hashed path", () => {
  const entry = publicSpeechCatalog()[0];
  const clip = { ...entry, src: `/speech/${entry.language}-${"a".repeat(64)}.mp3` };
  assert.equal(publicSpeechClip(entry.text, entry.language, [clip]), clip.src);
  assert.equal(publicSpeechClip(`${entry.text} changed`, entry.language, [clip]), undefined);
  assert.equal(publicSpeechClip(entry.text, entry.language, [{ ...clip, id: "unknown" }]), undefined);
  assert.equal(publicSpeechClip(entry.text, entry.language, [{ ...clip, src: "https://elsewhere.example/audio.mp3" }]), undefined);
});

test("a valid public clip plays without synthesis and a failed clip only retries the browser voice", async () => {
  const f = fixture();
  const entry = publicSpeechCatalog()[0];
  const clip = { ...entry, src: `/speech/${entry.language}-${"a".repeat(64)}.mp3` };
  f.clips.push(clip);
  f.playback.speak(entry.text, entry.language, { kind: "public" });
  assert.equal(f.calls, 0); assert.equal(f.audio.src, clip.src); assert.equal(f.plays, 1);
  const staleEnd = f.audio.onended!;
  f.audio.onerror?.call(f.audio as unknown as HTMLMediaElement, {} as Event);
  staleEnd.call(f.audio as unknown as HTMLMediaElement, {} as Event);
  assert.equal(f.states.at(-1)?.status, "browser-ready");
  f.playback.speak(entry.text, entry.language, { kind: "public" });
  await settle(); assert.equal(f.localCalls, 1); assert.equal(f.calls, 0); f.playback.dispose();
});

test("cloud audio is memory-only and its object URL is released on end", async () => {
  const f = fixture(); f.playback.speak("Please wait.", "en");
  assert.equal(f.states.at(-1)?.status, "loading-audio"); f.resolve(mp3()); await settle();
  assert.equal(f.plays, 1); assert.equal(f.audio.src, "blob:synthetic");
  f.audio.onended?.call(f.audio as unknown as HTMLMediaElement, {} as Event);
  assert.equal(f.revocations, 1); assert.equal(f.audio.src, ""); f.playback.dispose();
});

test("clear and superseding controls abort requests and cannot play late audio", async () => {
  const f = fixture(); f.playback.speak("Please wait.", "en"); f.playback.stop();
  assert.equal(f.signal?.aborted, true); f.resolve(mp3()); await settle(); assert.equal(f.plays, 0);
  const first = fixture(); first.playback.speak("Please wait.", "en");
  const second = fixture("browser"); second.playback.speak("Please sit.", "en");
  assert.equal(first.signal?.aborted, true); first.resolve(mp3()); await settle(); assert.equal(first.plays, 0);
  f.playback.dispose(); first.playback.dispose(); second.playback.dispose();
});

test("Safari blocked autoplay asks for a fresh gesture and reuses only the current in-memory audio", async () => {
  const f = fixture(); f.block(); f.playback.speak("Please wait.", "en"); f.resolve(mp3()); await settle();
  assert.equal(f.states.at(-1)?.status, "audio-ready");
  f.unblock(); f.playback.speak("Please wait.", "en"); await settle();
  assert.equal(f.calls, 1); assert.equal(f.plays, 2); f.playback.stop(); assert.equal(f.revocations, 1); f.playback.dispose();
});

test("cloud errors prompt a fresh browser-voice tap without silently queuing playback", async () => {
  const f = fixture(); f.playback.speak("Please wait.", "en");
  f.resolve(new Response("synthetic-private-error", { status: 502 })); await settle();
  assert.equal(f.states.at(-1)?.status, "browser-ready"); assert.equal(f.localCalls, 0);
  f.playback.speak("Please wait.", "en"); assert.equal(f.localCalls, 1); assert.equal(f.calls, 1); f.playback.dispose();
});

for (const [language, locale] of [["es", "es-ES"], ["ar", "ar-SA"], ["zh-Hans", "zh-CN"], ["en", "en-US"]]) {
  test(`${language} guided summary plays all existing Azure question/answer clips in order without cloud or browser speech`, () => {
    const f = guidedFixture();
    const text = guidedReadBack(language);
    const pack = guidedPack(language);
    const answers = guidedInputs.map(input => resolveGuided(input, pack));
    const expected = [...new Set(answers.map(answer => answer.questionId))].flatMap(id => [
      pack.questions[id].text,
      ...answers.filter(answer => answer.questionId === id).map(answer => answer.patient),
    ]).map(segment => publicSpeechClip(segment, locale, f.clips));
    assert.equal(expected.length, 11);
    assert.ok(expected.every(Boolean));
    assert.deepEqual(publicSpeechPlaylist(text, locale, f.clips), expected);
    f.playback.speak(text, locale, { kind: "public" });
    for (let index = 0; index < expected.length; index++) {
      assert.equal(f.audio.src, expected[index]);
      assert.equal(f.plays, index + 1);
      assert.equal(f.states.at(-1)?.speaking, true);
      end(f);
    }
    assert.equal(f.audio.src, "");
    assert.equal(f.states.at(-1)?.speaking, false);
    assert.equal(f.calls, 0);
    assert.equal(f.localCalls, 0);
    f.playback.dispose();
  });
}

test("guided playlists include registered tap phrases and repeated summary paragraphs", () => {
  const id = publicSpeechCatalog().find(entry => entry.language === "es" && entry.id.startsWith("phrase:"))!.id;
  const text = guidedReadBack("es", [{ questionId: "chief_complaint", kind: "option", value: id }, ...guidedInputs]);
  const single = publicSpeechPlaylist(text, "es", manifest.clips)!;
  assert.ok(single.length > 0);
  assert.deepEqual(publicSpeechPlaylist(`${text}\n\n${text}`, "es", manifest.clips), [...single, ...single]);
});

test("incomplete, changed or untrusted guided wording falls back as a whole without partial audio or synthesis", () => {
  const text = guidedReadBack();
  for (const altered of [`${text} unregistered`, `${text}\nprivate free text`, `${text}; `, text.replace("; ", "; unregistered; ")]) {
    assert.equal(publicSpeechPlaylist(altered, "es", manifest.clips), undefined);
  }
  assert.equal(publicSpeechPlaylist(text, "zh-Hant", manifest.clips), undefined);
  const f = guidedFixture();
  const missing = publicSpeechPlaylist(text, "es", f.clips)!.at(-1);
  f.clips.splice(0, f.clips.length, ...f.clips.filter(clip => clip.src !== missing));
  f.playback.speak(text, "es", { kind: "public" });
  assert.equal(f.plays, 0);
  assert.equal(f.localCalls, 1);
  assert.deepEqual(f.localTexts, [text]);
  assert.equal(f.calls, 0);
  f.playback.dispose();
});

test("stop, dispose, and another speaker discard queued clips and stale end callbacks", () => {
  for (const action of ["stop", "dispose", "supersede"] as const) {
    const f = guidedFixture();
    f.playback.speak(guidedReadBack(), "es", { kind: "public" });
    const firstEnd = f.audio.onended!;
    end(f);
    firstEnd.call(f.audio as unknown as HTMLMediaElement, {} as Event);
    assert.equal(f.plays, 2);
    const staleEnd = f.audio.onended!;
    const other = fixture("browser");
    if (action === "supersede") other.playback.speak("Please wait.", "en");
    else f.playback[action]();
    staleEnd.call(f.audio as unknown as HTMLMediaElement, {} as Event);
    assert.equal(f.plays, 2);
    assert.equal(f.audio.src, "");
    other.playback.dispose(); f.playback.dispose();
  }
});

test("Safari blocked playlist continuation resumes the same clip on a fresh tap without restarting the summary", async () => {
  const f = guidedFixture();
  const text = guidedReadBack();
  const paths = publicSpeechPlaylist(text, "es", f.clips)!;
  f.playback.speak(text, "es", { kind: "public" });
  f.block(); end(f); await settle();
  assert.equal(f.states.at(-1)?.status, "audio-ready");
  assert.equal(f.audio.src, paths[1]);
  f.unblock(); f.playback.speak(text, "es", { kind: "public" }); await settle();
  assert.equal(f.audio.src, paths[1]);
  end(f);
  assert.equal(f.audio.src, paths[2]);
  assert.equal(f.calls, 0); assert.equal(f.localCalls, 0);
  f.playback.dispose();
});

test("a failed playlist clip cancels remaining audio and offers the complete browser read-back on a fresh tap", async () => {
  const f = guidedFixture();
  const text = guidedReadBack();
  f.playback.speak(text, "es", { kind: "public" });
  end(f);
  const staleEnd = f.audio.onended!;
  f.audio.onerror?.call(f.audio as unknown as HTMLMediaElement, {} as Event);
  staleEnd.call(f.audio as unknown as HTMLMediaElement, {} as Event);
  assert.equal(f.plays, 2);
  assert.equal(f.states.at(-1)?.status, "browser-ready");
  f.playback.speak(text, "es", { kind: "public" }); await settle();
  assert.equal(f.localCalls, 1); assert.equal(f.calls, 0); assert.equal(f.plays, 2);
  assert.deepEqual(f.localTexts, [text]);
  f.playback.dispose();
});
