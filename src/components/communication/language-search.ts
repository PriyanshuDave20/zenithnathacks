// Language search for the setup screen and the in-session switcher. Both render whatever PATIENT_LANGUAGES holds
// (src/lib/mocks/data.ts), so more languages are a data change, not a UI change.
import type { LanguageOption } from "@/lib/mocks";

/** Case- and accent-insensitive, so "espanol" finds "Español". */
export const foldSearch = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export function languageMatches(l: LanguageOption, query: string) {
  const q = foldSearch(query);
  if (!q) return true;
  return [l.name, l.english, l.code, ...(l.aliases ?? [])].some((term) => foldSearch(term).includes(q));
}

/** Alphabetical by English name, so a long list is predictable to scan. */
export const byEnglishName = (a: LanguageOption, b: LanguageOption) => a.english.localeCompare(b.english);
