import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { translateAzureTexts } from "../server/translation";
import { GUIDED_LANGUAGES, QUESTION_SOURCE, validateLanguagePack, type LanguagePack } from "./localization";

type StaticTranslator = (request: { texts: string[]; from: string; to: string }) => Promise<{ texts: string[] }>;

/** Only public source strings enter this function; it has no patient/request input. */
export async function generateLanguagePack(language: string, translator: StaticTranslator = translateAzureTexts): Promise<LanguagePack> {
  if (!GUIDED_LANGUAGES.some((l) => l === language) || language === "en") throw new Error("Choose a supported non-English language.");
  const translated: LanguagePack["questions"] = {};
  const fields: { question: string; option?: string; text: string }[] = [];
  for (const [id, source] of Object.entries(QUESTION_SOURCE)) {
    translated[id] = { text: "", options: {} };
    fields.push({ question: id, text: source.text });
    for (const [option, text] of Object.entries(source.options)) {
      // Numeric answers are formatted locally, without translation or an LLM.
      if (id === "how_strong" && /^s\d+$/.test(option)) {
        translated[id].options[option] = `${Number(option.slice(1))}/10`;
      } else fields.push({ question: id, option, text });
    }
  }
  // Send only public source strings. IDs and English clinical mappings never leave code.
  for (let index = 0; index < fields.length; index += 25) {
    const batch = fields.slice(index, index + 25);
    const result = await translator({ texts: batch.map(({ text }) => text), from: "en", to: language });
    if (result.texts.length !== batch.length || result.texts.some(text => typeof text !== "string" || !text.trim())) {
      throw new Error("Generated translation batch is incomplete.");
    }
    batch.forEach((field, position) => {
      if (field.option === undefined) translated[field.question].text = result.texts[position];
      else translated[field.question].options[field.option] = result.texts[position];
    });
  }
  return validateLanguagePack({
    schemaVersion: 1, language, generatedBy: "Azure Translator REST v3",
    generatedAt: new Date().toISOString(), reviewStatus: "draft", source: QUESTION_SOURCE, questions: translated,
  });
}

export async function generateToFile(args: string[], root = process.cwd(), translator: StaticTranslator = translateAzureTexts): Promise<void> {
  const force = args.includes("--force");
  const languages = [...new Set(args.filter((arg) => arg !== "--force"))];
  if (!languages.length || languages.some((language) => !GUIDED_LANGUAGES.some((l) => l === language) || language === "en")) {
    throw new Error("Usage: npm run questions:translate -- es ar zh-Hans [--force]");
  }
  const destination = join(root, "src/lib/questions/language-packs.json");
  const existing: unknown = JSON.parse(await readFile(destination, "utf8"));
  if (!Array.isArray(existing)) throw new Error("Language pack cache must be an array.");
  let packs = [...existing];
  for (const language of languages) {
    const current = packs.find((p) => p?.language === language);
    try {
      if (!force && current) {
        validateLanguagePack(current);
        console.info(`${language}: cached; no provider call`);
        continue;
      }
    } catch { /* English source changed: regenerate this static pack. */ }
    const pack = await generateLanguagePack(language, translator);
    packs = [...packs.filter((p) => p?.language !== language), pack];
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(packs, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, destination); // Do not publish half-generated packs.
    console.info(`${language}: generated draft; clinical and fluent-speaker review required`);
  }
}
