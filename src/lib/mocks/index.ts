// Frontend mocks for POST /api/translate and POST /api/respond (docs/API.md).
// The UI calls these through src/components/session/api.ts. When Backend 1's routes land, swap that
// file to fetch() the real routes; nothing in the screens changes. Read src/lib/mocks/AGENTS.md.
//
// Testing the failure path: include "#fail" in any patient input or clinician message and the mock
// rejects like a 502 model failure, so the typed-fallback state can be demoed.

import { CLINICIAN_REPLIES, OUT_OF_FIVE, QUESTION_SHORT, QUESTIONS, TEACH_BACK, type PatientLanguage } from "./data";
import type {
  ApiError,
  MetricsEvent,
  RespondRequest,
  RespondResponse,
  TranslateRequest,
  TranslateResponse,
} from "./types";

export * from "./types";
export * from "./data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => 650 + Math.round(Math.random() * 450);

export class MockApiError extends Error {
  constructor(public body: ApiError, public status = 502) {
    super(body.error.message);
  }
}

function maybeFail(text: string) {
  if (text.includes("#fail")) {
    throw new MockApiError({ error: { code: "model_unavailable", message: "Translation is unavailable right now." } });
  }
}

/** Mimics the planned backend redaction pass (phone, email, long digit runs). Values are never returned. */
function redact(text: string): { text: string; count: number } {
  let count = 0;
  const out = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, () => (count++, "[removed]"))
    .replace(/\+?\d[\d\s().-]{6,}\d/g, () => (count++, "[removed]"));
  return { text: out, count };
}

const KEYWORDS: { id: string; re: RegExp; en: string }[] = [
  { id: "chest", re: /chest|pecho|صدر|胸/i, en: "chest" },
  { id: "head", re: /head|cabeza|رأس|头/i, en: "head" },
  { id: "stomach", re: /stomach|est[oó]mago|barriga|بطن|肚|胃/i, en: "stomach" },
  { id: "back", re: /\bback\b|espalda|ظهر|背/i, en: "back" },
];
const WORSE_BREATH = /breath|respir|تنفس|تنفّس|呼吸/i;
const FEVER = /fever|fiebre|حمى|حمّى|发烧/i;
const DIZZY = /dizz|mare|دوخ|头晕/i;
const TWO_DAYS = /two days|2 days|dos d[ií]as|يومين|两天/i;

const optionLabel = (qid: string, oid: string) =>
  QUESTIONS.find((q) => q.id === qid)?.options.find((o) => o.id === oid)?.label;
const optionText = (qid: string, oid: string, lang: string) =>
  QUESTIONS.find((q) => q.id === qid)?.options.find((o) => o.id === oid)?.text[lang] ?? oid;

export async function mockTranslate(req: TranslateRequest): Promise<TranslateResponse> {
  await delay(latency());
  const lang = req.context.language;
  const guided = req.inputs.filter((i) => i.questionId);
  const free = req.inputs.filter((i) => !i.questionId);
  maybeFail(req.inputs.map((i) => i.value).join(" "));

  const symptoms: string[] = [];
  const redFlags: string[] = [];
  let site: string | undefined;
  let duration: string | undefined;

  // Guided answers carry pre-written English labels: no machine translation needed.
  for (const g of guided) {
    const label = optionLabel(g.questionId!, g.value);
    if (!label) continue;
    if (g.questionId === "where") site = label.toLowerCase();
    else if (g.questionId === "how_long") duration = label;
    else if (g.value !== "none" && g.value !== "nothing") symptoms.push(label);
    if (g.value === "s5") redFlags.push("Severe pain (5/5)");
    if (g.value === "short_breath") redFlags.push("Shortness of breath");
  }

  const { text: freeText, count: redactions } = redact(free.map((f) => f.value).join(" ").trim());
  if (freeText) {
    site ??= KEYWORDS.find((k) => k.re.test(freeText))?.en;
    if (WORSE_BREATH.test(freeText)) symptoms.push("Worse when breathing");
    if (FEVER.test(freeText)) symptoms.push("Fever");
    if (DIZZY.test(freeText)) symptoms.push("Dizziness");
    if (TWO_DAYS.test(freeText)) duration ??= "2 days";
  }
  if (site === "chest") redFlags.unshift("Chest pain");

  const chiefComplaint = site ? `${site[0].toUpperCase()}${site.slice(1)} pain` : "Not clear from the patient's words";
  const translatedParts = [chiefComplaint, ...symptoms.map((s) => s.toLowerCase())];
  if (duration) translatedParts.push(`for ${duration.toLowerCase()}`);

  // Guided read-back pairs each answer with its question so the patient can confirm it ("Dónde: Pecho").
  const L = (lang in OUT_OF_FIVE ? lang : "en") as PatientLanguage;
  const guidedOriginal = guided
    .map((g) => {
      const answer = optionText(g.questionId!, g.value, lang);
      const shown = g.questionId === "how_strong" ? OUT_OF_FIVE[L](answer) : answer;
      return `${QUESTION_SHORT[g.questionId!]?.[L] ?? g.questionId}: ${shown}`;
    })
    .join("\n");
  const original = [freeText, guidedOriginal].filter(Boolean).join("\n");
  const known = Boolean(site || symptoms.length);

  return {
    original,
    translated: lang === "en" && freeText ? freeText : `${translatedParts.join(", ")}.`,
    backTranslation: original,
    summary: { chiefComplaint, symptoms, duration, redFlags },
    lowConfidence:
      freeText && lang !== "en"
        ? [{ phrase: freeText.slice(0, 60), reason: known ? "Demo only: matched keywords, not a full translation." : "Demo only: a real translation needs the translation service." }]
        : [],
    redactions,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();

/** True when the mock has a real demo translation for this reply; otherwise the UI shows a notice. */
export function mockCanTranslateReply(message: string, lang: string) {
  return lang === "en" || CLINICIAN_REPLIES.some((r) => norm(r.en) === norm(message));
}

export async function mockRespond(req: RespondRequest): Promise<RespondResponse> {
  await delay(latency());
  maybeFail(req.message);
  const lang = req.context.language as PatientLanguage;
  const hit = CLINICIAN_REPLIES.find((r) => norm(r.en) === norm(req.message));
  const patientText = hit ? hit.text[lang] ?? req.message : req.message;
  return { patientText, readAloudText: patientText, teachBackPrompt: TEACH_BACK[lang] ?? TEACH_BACK.en };
}

/** Anonymous counts only (docs/API.md POST /api/metrics). The mock drops them; no content, no identifiers. */
export async function mockMetrics(_event: MetricsEvent): Promise<void> {
  void _event;
}
