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
