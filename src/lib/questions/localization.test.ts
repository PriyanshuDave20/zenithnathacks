import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateLanguagePack, generateToFile } from "./generator";
import { getGuidedQuestions, getLanguagePack, QUESTION_SOURCE, validateLanguagePack, validateWritingSystem } from "./localization";
const fakeTranslator = async ({ texts }: { texts: string[] }) => ({ texts: [...texts] });

test("offline pack generation covers all 17 questions and exact option IDs in bounded static-only batches", async () => {
  let calls = 0;
  const publicText = new Set(Object.entries(QUESTION_SOURCE).flatMap(([id, question]) => [
    question.text,
    ...Object.entries(question.options).filter(([option]) => id !== "how_strong" || !/^s\d+$/.test(option)).map(([, text]) => text),
  ]));
  const pack = await generateLanguagePack("es", async ({ texts, from, to }) => {
    calls += 1;
    assert.equal(from, "en");
    assert.equal(to, "es");
    assert.ok(texts.length <= 25);
    assert.ok(texts.every(text => publicText.has(text)));
    return fakeTranslator({ texts });
  });
  assert.ok(calls > 1);
  assert.equal(pack.generatedBy, "Azure Translator REST v3");
  assert.equal(pack.reviewStatus, "draft");
  assert.deepEqual(pack.source, QUESTION_SOURCE);
  assert.deepEqual(Object.keys(pack.questions), Object.keys(QUESTION_SOURCE));
  validateLanguagePack(pack);
});

test("packs reject missing IDs, stale wording, blank translations, extra answers and changed scales", async () => {
  const valid = await generateLanguagePack("es", fakeTranslator);
  for (const change of [
    (pack: typeof valid) => { delete pack.questions.where; },
    (pack: typeof valid) => { pack.questions.where.text = " "; },
    (pack: typeof valid) => { pack.source.where.text += " changed"; },
    (pack: typeof valid) => { pack.source.where.options.head = "wrong label"; },
    (pack: typeof valid) => { pack.questions.where.options.invented = "invented"; },
    (pack: typeof valid) => { pack.questions.how_strong.options.s10 = "5 out of 5"; },
  ]) {
    const pack = structuredClone(valid);
    change(pack);
    assert.throws(() => validateLanguagePack(pack));
  }
  await assert.rejects(generateLanguagePack("es", async ({ texts }) => ({ texts: texts.slice(1) })));
  await assert.rejects(generateLanguagePack("es", async ({ texts }) => ({ texts: [...texts, "extra"] })));
  await assert.rejects(generateLanguagePack("es", async ({ texts }) => ({ texts: texts.map(text => `${text} 999`) })));
  await assert.rejects(generateLanguagePack("unsupported", fakeTranslator));
});

test("current packs are reused without provider calls and failed regeneration preserves the last complete JSON", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "synapse-public-packs-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src/lib/questions"), { recursive: true });
  const path = join(root, "src/lib/questions/language-packs.json");
  await writeFile(path, JSON.stringify([await generateLanguagePack("es", fakeTranslator)]));
  const previous = await readFile(path, "utf8");
  let calls = 0;
  const fail = async () => { calls += 1; throw new Error("Synthetic provider failure"); };
  await generateToFile(["es"], root, fail);
  assert.equal(calls, 0);
  await assert.rejects(generateToFile(["es", "--force"], root, fail));
  assert.equal(await readFile(path, "utf8"), previous);
});

test("English is available offline; bedside questions share canonical IDs and a 0–10 scale", () => {
  assert.ok(getLanguagePack("en"));
  assert.equal(getLanguagePack("zz"), undefined);
  const questions = getGuidedQuestions("en")!;
  assert.equal(questions.length, 5);
  assert.deepEqual(questions.map((q) => q.id), ["where", "how_long", "how_strong", "aggravating_factors", "associated_symptoms"]);
  assert.equal(questions[2].options[10].label, "10 out of 10");
});

test("wrong-script generated labels are rejected before use, including mixed Arabic/Chinese side labels", () => {
  assert.throws(() => validateWritingSystem("ar", "ذراع左侧"));
  assert.throws(() => validateWritingSystem("zh-Hans", "左侧 ذراع"));
  assert.throws(() => validateWritingSystem("es", "Brazo 左"));
  validateWritingSystem("ar", "الذراع اليسرى");
  validateWritingSystem("zh-Hans", "左臂");
  validateWritingSystem("es", "Brazo izquierdo");
});
