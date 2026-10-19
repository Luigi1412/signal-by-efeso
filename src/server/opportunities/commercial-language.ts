const PROMOTIONAL = [
  /\bmassive\b/i,
  /\bhuge\b/i,
  /\buniquely positioned\b/i,
  /\burgently needs\b/i,
  /\bwill launch\b/i,
  /\bwill buy\b/i,
  /\bclient needs consulting\b/i,
  /\bclient will\b/i,
  /\bcall (the )?client\b/i,
  /\bschedule (a )?meeting\b/i,
  /\bsend (a )?proposal\b/i,
  /\bsales opportunity\b/i,
  /\bwin\b/i,
  /\bpipeline\b/i,
  /\bguaranteed\b/i,
  /\bmust buy\b/i,
  /\baggressive\b/i,
  /\bpitch\b/i,
  /\bcontact (the )?(cfo|ceo|client)\b/i,
  /\brecommended (next )?action\b/i,
  /\bnext commercial step\b/i,
];

const CERTAINTY = [
  /\bclient needs\b/i,
  /\bneeds efeso\b/i,
  /\bwill (launch|implement|hire|buy)\b/i,
  /\bhas already\b/i,
  /\boperational already\b/i,
  /\bconfirmed need\b/i,
];

const HYPOTHESIS = /\b(potential|potencial|possible|poss[ií]vel|may|might|hip[oó]tese)\b/i;

export function detectOpportunityPromotionalLanguage(text: string): string[] {
  return PROMOTIONAL.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function detectUnsupportedDirectNeed(text: string): string[] {
  return CERTAINTY.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function hasHypothesisLanguage(title: string): boolean {
  return HYPOTHESIS.test(title);
}

export function detectCausalOverreach(text: string): string[] {
  return [/\bbecause of\b/i, /\btherefore\b/i, /\bwill cause\b/i, /\bas a result of\b/i]
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}
