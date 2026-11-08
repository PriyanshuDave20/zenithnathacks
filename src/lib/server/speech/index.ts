import { redact } from "../redact";

export const MAX_SPEECH_TEXT = 2000;
const MAX_AUDIO_BYTES = 2_000_000;
const VOICES = {
  en: { language: "en-US", name: "en-US-JennyNeural" },
  es: { language: "es-ES", name: "es-ES-ElviraNeural" },
  ar: { language: "ar-SA", name: "ar-SA-ZariyahNeural" },
  "zh-Hans": { language: "zh-CN", name: "zh-CN-XiaoxiaoNeural" },
} as const;
export type SpeechLanguage = keyof typeof VOICES;

export class SpeechUnavailableError extends Error {
  constructor() { super("Speech is unavailable."); }
}

/** Only the app's explicitly supported spoken languages can select a cloud voice. */
export function speechLanguage(language: string): SpeechLanguage | undefined {
  try {
    const locale = new Intl.Locale(language);
    if (["en", "es", "ar"].includes(locale.language)) return locale.language as SpeechLanguage;
    if ((locale.language === "zh" || locale.language === "cmn")
      && !["HK", "MO"].includes(locale.region ?? "") && locale.script !== "Hant") return "zh-Hans";
  } catch { /* Invalid locale is rejected without echoing it. */ }
  return undefined;
}

export function speechVoice(language: string) {
  const key = speechLanguage(language);
  return key ? VOICES[key] : undefined;
}

function configuration() {
  const provider = process.env.SPEECH_PROVIDER?.trim() || "browser";
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (provider !== "azure" || !key || !region || !/^[a-z][a-z0-9]{1,30}$/.test(region)) return undefined;
  return { key, region };
}

export function azureSpeechAvailable(): boolean { return Boolean(configuration()); }

const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
})[character]!);

/** Real-time prebuilt voices only. Audio exists in request memory and is never cached or logged. */
export async function synthesizeSpeech(text: string, language: string, signal?: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const config = configuration();
    const voice = speechVoice(language);
    if (!config || !voice || !text.trim() || text.length > MAX_SPEECH_TEXT) throw new Error();
    const safe = redact(text).text;
    const response = await fetch(`https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": config.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "Synapse-Synthetic-Demo",
      },
      body: `<speak version="1.0" xml:lang="${voice.language}"><voice name="${voice.name}">${escapeXml(safe)}</voice></speak>`,
      cache: "no-store", credentials: "omit", redirect: "error",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    });
    if (!response.ok || !response.headers.get("Content-Type")?.toLowerCase().startsWith("audio/mpeg")) throw new Error();
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_AUDIO_BYTES) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    if (!length) throw new Error();
    const audio = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.length; }
    return audio;
  } catch { throw new SpeechUnavailableError(); }
}
