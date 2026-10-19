const COMMERCIAL_PATTERNS = [
  /\bopportunit(?:y|ies)\b/i,
  /\bpitch\b/i,
  /\bsell\b/i,
  /\bselling\b/i,
  /\bwhy efeso\b/i,
  /\befeso should\b/i,
  /\brecommend(?:ed|ation)?\b/i,
  /\blead scoring\b/i,
  /\bcontact\b/i,
  /\bsales\b/i,
  /\baggressive growth\b/i,
  /\bhuge\b/i,
  /\burgent(?:ly)?\b/i,
  /\bcommercially relevant\b/i,
  /\bwin\b/i,
  /\bpipeline\b/i,
  /\bapproach the client\b/i,
  /\bnext step\b/i,
];

export function detectCommercialLanguage(title: string, summary: string): string[] {
  const text = `${title} ${summary}`;
  return COMMERCIAL_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function hasCommercialLanguage(title: string, summary: string): boolean {
  return detectCommercialLanguage(title, summary).length > 0;
}
