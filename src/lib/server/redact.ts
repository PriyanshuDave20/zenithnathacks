const MONTH = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

// Mask numeric calendar dates and English month-name dates, before phone matching.
const DATES = new RegExp(
  String.raw`\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b|\b${MONTH}\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b|\b\d{1,2}(?:st|nd|rd|th)?\s+${MONTH}\.?(?:,?\s+\d{4})?\b`,
  "gi",
);
const EMAILS = /[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/g;
const NORTH_AMERICAN_PHONES = /(?<![\p{L}\p{N}+])(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?:\s*(?:ext\.?|x)\s*\d{1,6})?(?![\p{L}\p{N}])/giu;
const LOCAL_PHONES = /(?<![\p{L}\p{N}+])\d{3}[.-]?\d{4}(?:\s*(?:ext\.?|x)\s*\d{1,6})?(?![\p{L}\p{N}])/giu;
// Common international/North American formatting; require 7–15 digits.
const PHONES = /(?<![\p{L}\p{N}])\+?(?:\(\d{1,4}\)|\d)[\d(). -]*\d(?:\s*(?:ext\.?|x)\s*\d{1,6})?(?![\p{L}\p{N}])/giu;

/** Best-effort masking only: not a complete identifier detector. Never logs or stores matches. */
export function redact(text: string): { text: string; count: number } {
  let count = 0;
  const mask = () => {
    count += 1;
    return "[removed]";
  };
  const result = text
    .replace(EMAILS, mask)
    .replace(DATES, mask)
    // Match individual common numbers first so adjacent numbers count separately.
    .replace(NORTH_AMERICAN_PHONES, mask)
    .replace(LOCAL_PHONES, mask)
    .replace(PHONES, (match) => {
      const base = match.split(/\s*(?:ext\.?|x)\s*/i)[0];
      const digits = base.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15 ? mask() : match;
    });
  return { text: result, count };
}
