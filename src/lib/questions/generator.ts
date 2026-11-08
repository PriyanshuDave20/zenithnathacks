import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { callNvidia, NVIDIA_MODEL } from "../server/providers/nvidia";
import { GUIDED_LANGUAGES, QUESTION_SOURCE, TranslatedQuestionsSchema, validateLanguagePack, type LanguagePack } from "./localization";

/** Only public source strings enter this function; it has no patient/request input. */
export async function generateLanguagePack(language: string, model = callNvidia): Promise<LanguagePack> {
  if (!GUIDED_LANGUAGES.some((l) => l === language) || language === "en") throw new Error("Choose a supported non-English language.");
  const translated: LanguagePack["questions"] = {};
  const entries = Object.entries(QUESTION_SOURCE);
  const protect = (text: string) => {
    let index = 0;
    return text.replace(/\d+/g, () => `{{NUM_${index++}}}`);
  };
  const restore = (text: string, source: string) => {
    const numbers = source.match(/\d+/g) ?? [];
    if (numbers.some((_, i) => text.split(`{{NUM_${i}}}`).length !== 2)
      || (text.match(/\{\{NUM_\d+\}\}/g) ?? []).length !== numbers.length) {
      throw new Error("Generated text changed numeric values.");
    }
    return text.replace(/\{\{NUM_(\d+)\}\}/g, (_, index) => numbers[Number(index)]);
  };
  // Small batches fit the provider output limit even for verbose tokenizations.
  for (let i = 0; i < entries.length; i += 3) {
    const batch = Object.fromEntries(entries.slice(i, i + 3).map(([id, q]) => [id, { text: q.text, options: q.options }]));
    // A numeric scale is data, not prose. Format numeric answers locally instead
    // of asking a model to translate eleven copies of "N out of 10".
    if (batch.how_strong) batch.how_strong.options = Object.fromEntries(
      Object.entries(batch.how_strong.options).filter(([id]) => !/^s\d+$/.test(id)),
    );
    const protectedBatch = Object.fromEntries(Object.entries(batch).map(([id, q]) => [id, {
      text: protect(q.text), options: Object.fromEntries(Object.entries(q.options).map(([oid, label]) => [oid, protect(label)])),
    }]));
    const raw = await model({
      system: [
        "Translate public Synapse question-bank wording, not patient data. Omit identifiers. Do not diagnose.",
        `Translate every question and answer from English into ${language === "ar" ? "Arabic (العربية), using Arabic script only" : language === "zh-Hans" ? "Simplified Chinese (简体中文), using Chinese characters only" : "Spanish (Español), using Latin script"}. BCP-47 language: ${language}.`,
        "Use only the requested language and its writing system. Fully translate left/right wording.",
        "Use short, plain patient-facing language. Preserve negation, uncertainty, body side, every number and severity scale.",
        "Keep each numeric token exactly as written using ASCII digits. Do not spell out or omit a number, and do not drop a scale denominator (for example 0 out of 10 must retain both 0 and 10).",
        "Numeric values are protected as placeholders such as {{NUM_0}} and {{NUM_1}}. Keep EACH placeholder exactly once in its original field, including BOTH placeholders in every severity option. Translate only the surrounding words.",
        "Return only a JSON object with exactly one field: questions. Its value has the exact input question IDs.",
        "Each question has exactly text (translated question string) and options (the exact option IDs mapped to translated strings).",
        "Never translate, rename, add or remove IDs. Do not include English clinical commentary, markdown or extra fields.",
      ].join("\n"),
      user: JSON.stringify({ questions: protectedBatch }),
    });
    const parsed = z.strictObject({ questions: TranslatedQuestionsSchema }).parse(JSON.parse(raw));
    if (Object.keys(parsed.questions).sort().join() !== Object.keys(batch).sort().join()) throw new Error("Generated question IDs do not match the source.");
    for (const [id, question] of Object.entries(parsed.questions)) {
      if (Object.keys(question.options).sort().join() !== Object.keys(batch[id].options).sort().join()) {
        throw new Error("Generated answer IDs do not match the source.");
      }
      question.text = restore(question.text, batch[id].text);
      question.options = Object.fromEntries(Object.entries(question.options).map(([oid, text]) => [oid, restore(text, batch[id].options[oid])]));
      if (id === "how_strong") {
        for (let value = 0; value <= 10; value += 1) question.options[`s${value}`] = `${value}/10`;
      }
      translated[id] = question;
    }
  }
  return validateLanguagePack({
    schemaVersion: 1, language, generatedBy: process.env.LLM_MODEL?.trim() || NVIDIA_MODEL,
    generatedAt: new Date().toISOString(), reviewStatus: "draft", source: QUESTION_SOURCE, questions: translated,
  });
}

export async function generateToFile(args: string[], root = process.cwd(), model = callNvidia): Promise<void> {
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
        console.info(`${language}: cached; no model call`);
        continue;
      }
    } catch { /* English source changed: regenerate this static pack. */ }
    const pack = await generateLanguagePack(language, model);
    packs = [...packs.filter((p) => p?.language !== language), pack];
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(packs, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, destination); // Do not publish half-generated packs.
    console.info(`${language}: generated draft; clinical and fluent-speaker review required`);
  }
}
