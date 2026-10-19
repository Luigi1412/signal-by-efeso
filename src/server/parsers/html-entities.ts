/** Decode common HTML entities so stored/model text matches the visible article. */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => codePointToChar(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => codePointToChar(Number.parseInt(dec, 10)));
}

function codePointToChar(code: number): string {
  if (!Number.isFinite(code) || code <= 0) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
