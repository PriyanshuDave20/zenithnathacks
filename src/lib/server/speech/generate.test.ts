import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicSpeechCatalog } from "../../questions/speech-catalog";
import { generateToFile } from "./generate";

test("public generation deduplicates wording, paces calls, reuses assets and rejects arbitrary input", async t => {
  const root = mkdtempSync(join(tmpdir(), "synapse-public-audio-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const allowed = publicSpeechCatalog().filter(entry => entry.language === "en");
  let calls = 0;
  let pauses = 0;
  const dependencies = { root, async synthesize(text: string, language: string) {
    assert.ok(allowed.some(entry => entry.language === language && entry.text === text));
    calls++; return new Uint8Array([1, 2, 3]);
  }, async pause() { pauses++; } };
  await assert.rejects(generateToFile(["patient-supplied-text"], dependencies));
  assert.equal(calls, 0);
  await generateToFile(["en"], dependencies);
  const unique = new Set(allowed.map(entry => entry.text)).size;
  assert.equal(calls, unique); assert.equal(pauses, unique - 1);
  const manifest = JSON.parse(readFileSync(join(root, "public/speech/manifest.json"), "utf8"));
  assert.equal(manifest.clips.length, allowed.length);
  assert.equal(new Set(manifest.clips.map((clip: { src: string }) => clip.src)).size, unique);
  await generateToFile(["en"], dependencies);
  assert.equal(calls, unique);
});

test("failed generation leaves the complete manifest intact and completed clips resume safely", async t => {
  const root = mkdtempSync(join(tmpdir(), "synapse-public-audio-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const good = { root, async synthesize() { return new Uint8Array([1, 2, 3]); }, async pause() {} };
  await generateToFile(["en"], good);
  const path = join(root, "public/speech/manifest.json");
  const before = readFileSync(path, "utf8");
  let requests = 0;
  await assert.rejects(generateToFile(["en", "--force"], { ...good, async synthesize() {
    if (++requests === 2) throw new Error("Synthetic provider failure");
    return new Uint8Array([4, 5, 6]);
  } }));
  assert.equal(readFileSync(path, "utf8"), before);
  assert.ok(!readdirSync(join(root, "public/speech")).some(name => name.endsWith(".tmp")));
  const changed = JSON.parse(before);
  changed.clips.push({ id: "question:where", language: "ar", text: "stale-public-wording", src: `/speech/ar-${"a".repeat(64)}.mp3` });
  writeFileSync(path, JSON.stringify(changed));
  await generateToFile(["en"], good);
  assert.equal(JSON.parse(readFileSync(path, "utf8")).clips.some((clip: { text: string }) => clip.text === "stale-public-wording"), false);
});
