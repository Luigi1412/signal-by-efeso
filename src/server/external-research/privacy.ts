/** Public company research input only. Never send internal notes or contacts. */
export function sanitizePublicResearchQuery(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\b(?:relationship|relacionamento|account owner|contato interno)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}
