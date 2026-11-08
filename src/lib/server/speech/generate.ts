import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicSpeechCatalog } from "../../questions/speech-catalog";
import { GUIDED_LANGUAGES } from "../../questions/localization";
import { speechVoice, synthesizeSpeech } from "./index";

type Clip = { id: string; language: string; text: string; src: string };

/** Maintenance only: the caller cannot supply text, IDs, output paths or arbitrary audio URLs. */
export async function generateToFile(args: string[], dependencies: {
  root?: string;
  synthesize?: typeof synthesizeSpeech;
  pause?: () => Promise<void>;
} = {}): Promise<void> {
  const force = args.includes("--force");
  const languages = args.filter(arg => arg !== "--force");
  if (!languages.length || languages.some(language => !(GUIDED_LANGUAGES as readonly string[]).includes(language))) {
    throw new Error("Choose supported public speech languages.");
  }
  const directory = resolve(dependencies.root ?? process.cwd(), "public/speech");
  mkdirSync(directory, { recursive: true });
  const manifestPath = resolve(directory, "manifest.json");
  let previous: Clip[] = [];
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (parsed.schemaVersion === 1 && Array.isArray(parsed.clips)) previous = parsed.clips;
  } catch { /* A complete fresh manifest is written only after successful generation. */ }
  const clips: Clip[] = [];
  const generated = new Set<string>();
  const synthesize = dependencies.synthesize ?? synthesizeSpeech;
  // Free F0 permits 20 real-time synthesis transactions per 60 seconds.
  const pause = dependencies.pause ?? (() => new Promise<void>(done => setTimeout(done, 3100)));
  let requests = 0;
  for (const entry of publicSpeechCatalog().filter(entry => languages.includes(entry.language))) {
    const voice = speechVoice(entry.language)!;
    // Identical wording/voice across canonical IDs shares one public audio asset.
    const digest = createHash("sha256").update(JSON.stringify({ language: entry.language, text: entry.text, voice: voice.name })).digest("hex");
    const filename = `${entry.language}-${digest}.mp3`;
    const destination = resolve(directory, filename);
    let reusable = false;
    try { reusable = statSync(destination).size > 0; } catch { /* Missing assets are generated below. */ }
    if (!generated.has(filename) && (force || !reusable)) {
      if (requests++) await pause();
      const audio = await synthesize(entry.text, entry.language);
      if (!audio.byteLength) throw new Error("Speech is unavailable.");
      const temporary = `${destination}.tmp`;
      try { writeFileSync(temporary, audio); renameSync(temporary, destination); }
      finally { try { unlinkSync(temporary); } catch { /* Already atomically renamed or not written. */ } }
      generated.add(filename);
    }
    clips.push({ ...entry, src: `/speech/${filename}` });
  }
  // Retain only still-current entries for languages not regenerated in this invocation.
  const current = publicSpeechCatalog();
  const retained = previous.filter(clip => !languages.includes(clip.language)
    && current.some(entry => entry.id === clip.id && entry.language === clip.language && entry.text === clip.text)
    && /^\/speech\/[a-zA-Z-]+-[a-f0-9]{64}\.mp3$/.test(clip.src));
  const temporary = `${manifestPath}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ schemaVersion: 1, clips: [...retained, ...clips] }, null, 2)}\n`);
  renameSync(temporary, manifestPath);
  console.log(`Public speech assets ready: ${clips.length} clips.`);
}
