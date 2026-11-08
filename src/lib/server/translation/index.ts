import { z } from "zod";
import { STORIES } from "../fixtures/stories";
import { redact } from "../redact";

export type TextTranslationRequest = { texts: string[]; from: string; to: string; signal?: AbortSignal };
export type TextTranslationResult = { texts: string[]; redactions: number; mock: boolean };
export type TextTranslator = (request: TextTranslationRequest) => Promise<TextTranslationResult>;
const unavailable = () => new Error("Translation provider is unavailable.");

/** Azure uses script-specific Chinese codes and base codes for these regional languages. */
export function translationLanguage(language: string): string {
  if (!language.trim() || language.length > 128) throw unavailable();
  const locale = new Intl.Locale(language);
  if (locale.language === "zh") return locale.script === "Hant" || ["TW", "HK", "MO"].includes(locale.region ?? "") ? "zh-Hant" : "zh-Hans";
  if (locale.language === "fr" && locale.region === "CA") return "fr-CA";
  if (locale.language === "pt" && locale.region === "PT") return "pt-PT";
  if (locale.language === "sr") return locale.script === "Cyrl" ? "sr-Cyrl" : "sr-Latn";
  return locale.script ? `${locale.language}-${locale.script}` : locale.language;
}

function mockText(text: string, from: string, to: string): string {
  for (const story of STORIES) {
    const language = translationLanguage(story.translateRequest.context.language);
    if (from === language && to === "en" && text === story.translateResponse.original) return story.translateResponse.translated;
    if (from === "en" && to === language) {
      if (text === story.translateResponse.translated) return story.translateResponse.backTranslation;
      for (const key of ["patientText", "readAloudText", "teachBackPrompt"] as const) {
        if (text === STORIES[0].respondResponse[key]) return story.respondResponse[key];
      }
    }
  }
  throw unavailable();
}

const AzureResult = z.array(z.object({
  translations: z.array(z.object({ text: z.string().trim().min(1), to: z.string().min(1) })).length(1),
}));

async function translateWithProvider({ texts, from, to, signal }: TextTranslationRequest, provider: string): Promise<TextTranslationResult> {
  try {
    signal?.throwIfAborted();
    if (provider !== "mock" && provider !== "azure") throw unavailable();
    const source = translationLanguage(from);
    const target = translationLanguage(to);
    if (!texts.length || texts.length > 100 || texts.some((text) => !text.trim())
      || texts.reduce((length, text) => length + text.length, 0) > 20000) throw unavailable();
    let redactions = 0;
    const mask = (text: string) => {
      const result = redact(text); redactions += result.count; return result.text;
    };
    const safe = texts.map(mask);
    if (source === target) return { texts: safe, redactions, mock: provider === "mock" };
    if (provider === "mock") return { texts: safe.map((text) => mask(mockText(text, source, target))), redactions, mock: true };
    const key = process.env.AZURE_TRANSLATOR_KEY?.trim();
    const region = process.env.AZURE_TRANSLATOR_REGION?.trim();
    if (!key || (region && !/^[a-z0-9-]{1,40}$/.test(region))) throw unavailable();
    const endpoint = new URL("https://api.cognitive.microsofttranslator.com/translate");
    endpoint.search = new URLSearchParams({ "api-version": "3.0", from: source, to: target, textType: "plain" }).toString();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json; charset=UTF-8",
        ...(region && region !== "global" ? { "Ocp-Apim-Subscription-Region": region } : {}) },
      body: JSON.stringify(safe.map((Text) => ({ Text }))),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
      cache: "no-store", credentials: "omit", redirect: "error",
    });
    if (!response.ok) throw unavailable();
    const result = AzureResult.parse(await response.json());
    if (result.length !== safe.length || result.some((item) => translationLanguage(item.translations[0].to) !== target)) throw unavailable();
    return { texts: result.map((item) => mask(item.translations[0].text)), redactions, mock: false };
  } catch { throw unavailable(); }
}

/** Stateless runtime entry point; offline fixtures by default and no LLM fallback. */
export const translateTexts: TextTranslator = (request) => translateWithProvider(request, process.env.TRANSLATION_PROVIDER?.trim() || "mock");
/** Explicit maintenance entry point; callers may submit only the public static catalog. */
export const translateAzureTexts: TextTranslator = (request) => translateWithProvider(request, "azure");
