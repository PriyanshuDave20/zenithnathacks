import assert from "node:assert/strict";
import { test } from "node:test";
import { publicSpeechCatalog } from "../../lib/questions/speech-catalog";
import { createCloudSpeech, publicSpeechClip, type SpeechMetadata } from "./cloud-speech";
import type { SpeechPlaybackState } from "./speech-playback";

function fixture(provider: SpeechMetadata["provider"] = "azure") {
  const states: SpeechPlaybackState[] = [];
  let calls = 0;
  let localCalls = 0;
  let plays = 0;
  let revocations = 0;
  let resolve: (response: Response) => void = () => {};
  let signal: AbortSignal | null | undefined;
  let blocked = false;
  const clips: SpeechMetadata["clips"] = [];
  const audio = { src: "", onended: null as HTMLAudioElement["onended"], onerror: null as HTMLAudioElement["onerror"], pause() {},
    play() { plays++; return blocked ? Promise.reject(new DOMException("blocked", "NotAllowedError")) : Promise.resolve(); } };
  const playback = createCloudSpeech({ speak() { localCalls++; }, stop() {}, dispose() {} }, state => states.push(state), {
    fetch: ((_: unknown, init: RequestInit) => { calls++; signal = init.signal; return new Promise<Response>(done => { resolve = done; }); }) as typeof fetch,
    makeAudio: () => audio, createUrl: () => "blob:synthetic", revokeUrl() { revocations++; }, metadata: () => ({ provider, clips }),
  });
  return { playback, audio, states, clips, get calls() { return calls; }, get localCalls() { return localCalls; }, get plays() { return plays; }, get revocations() { return revocations; }, get signal() { return signal; }, resolve: (response: Response) => resolve(response), block: () => { blocked = true; }, unblock: () => { blocked = false; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const mp3 = () => new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });

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
