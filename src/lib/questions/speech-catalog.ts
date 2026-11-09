import { BODY_PARTS } from "../input/body-parts";
import { PHRASES } from "../mocks/data";
import { getLanguagePack, GUIDED_LANGUAGES } from "./localization";

export type PublicSpeechEntry = { id: string; language: string; text: string };

/** The only texts eligible for persisted speech assets: checked-in public UI wording. */
export function publicSpeechCatalog(): PublicSpeechEntry[] {
  return GUIDED_LANGUAGES.flatMap(language => {
    const pack = getLanguagePack(language);
    if (!pack) return [];
    return [
      ...Object.entries(pack.questions).flatMap(([id, question]) => [
        { id: `question:${id}`, language, text: question.text },
        ...Object.entries(question.options).map(([option, text]) => ({ id: `option:${id}:${option}`, language, text })),
      ]),
      ...PHRASES.map(phrase => ({ id: `phrase:${phrase.id}`, language, text: phrase.text[language] })),
      ...BODY_PARTS.map(part => ({ id: `body:${part.id}`, language, text: part.text[language] })),
    ];
  });
}

/** Resolve a deterministic guided read-back into public wording, without caching session selections. */
export function guidedSpeechSegments(text: string, language: string): string[] | undefined {
  const pack = getLanguagePack(language);
  if (!pack) return undefined;
  const segments: string[] = [];
  for (const line of text.split(/\n+/)) {
    const match = Object.entries(pack.questions).find(([, question]) => line.startsWith(`${question.text} `));
    if (!match) return undefined;
    const [id, question] = match;
    const allowed = new Set([
      ...Object.values(question.options),
      ...(id === "where" ? BODY_PARTS.map(part => part.text[pack.language]) : []),
      ...(id === "chief_complaint" ? PHRASES.map(phrase => phrase.text[pack.language]) : []),
    ]);
    const answers = line.slice(question.text.length + 1).split("; ");
    if (answers.some(answer => !allowed.has(answer))) return undefined;
    segments.push(question.text, ...answers);
  }
  return segments.length ? segments : undefined;
}
