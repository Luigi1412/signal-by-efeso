import { detectCommercialLanguage } from "@/server/signals/commercial-language";

const EXTRA_PATTERNS = [
  /\befeso\b/i,
  /\brecommended offer\b/i,
  /\bwhat we should sell\b/i,
  /\bnext commercial step\b/i,
  /\bwho we should approach\b/i,
  /\bpitch\b/i,
];

export function accountNarrativeHasForbiddenLanguage(text: string): string[] {
  const commercial = detectCommercialLanguage(text, "");
  const extra = EXTRA_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  return [...new Set([...commercial, ...extra])];
}

const UNSUPPORTED_INFERENCE = [
  /\bfinancially strong\b/i,
  /\bin crisis\b/i,
  /\bwill accelerate\b/i,
  /\bwill fail\b/i,
  /\boutage\b/i,
  /\balready increased\b/i,
  /\bhas already increased\b/i,
  /\bcapacity has already\b/i,
];

export function detectUnsupportedNarrativeInference(text: string): string[] {
  return UNSUPPORTED_INFERENCE.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

const CAUSAL_OVERREACH = [/\bbecause of\b/i, /\btherefore\b/i, /\bwill cause\b/i, /\bdue to this\b/i, /\bas a result of\b/i];

export function detectCausalOverreach(text: string): string[] {
  return CAUSAL_OVERREACH.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}
