import { assertionModeSchema } from "@/server/ai/schemas/claim-extraction-schema";

export const ASSERTION_MODE_RANK: Record<string, number> = {
  reported_actual: 7,
  announced: 6,
  planned: 5,
  expected: 4,
  target: 3,
  estimated: 2,
  conditional: 1,
  unspecified: 0,
};

const REALIZED = new Set(["reported_actual"]);

export function isAllowedAssertionMode(value: string): boolean {
  return (assertionModeSchema.options as readonly string[]).includes(value);
}

/** Weakest / most conservative modality among the linked claims. */
export function conservativeAssertionMode(modes: string[]): string {
  if (modes.length === 0) return "unspecified";
  let weakest = modes[0] ?? "unspecified";
  let rank = ASSERTION_MODE_RANK[weakest] ?? 0;
  for (const mode of modes) {
    const next = ASSERTION_MODE_RANK[mode] ?? 0;
    if (next < rank) {
      weakest = mode;
      rank = next;
    }
  }
  return weakest;
}

export function assertionModeIsRealized(mode: string): boolean {
  return REALIZED.has(mode);
}

export function signalOverstatesAssertion(signalMode: string, claimModes: string[]): boolean {
  const conservative = conservativeAssertionMode(claimModes);
  const signalRank = ASSERTION_MODE_RANK[signalMode] ?? 0;
  const claimRank = ASSERTION_MODE_RANK[conservative] ?? 0;
  return signalRank > claimRank;
}

const REALIZED_TITLE_PATTERNS = [
  /\binvested\b/i,
  /\bincreased by\b/i,
  /\bwill build\b/i,
  /\bbuilt\b/i,
  /\brealized\b/i,
  /\bcompleted acquisition\b/i,
  /\bacquired\b/i,
  /\bcrisis\b/i,
];

export function titleImpliesRealized(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  return REALIZED_TITLE_PATTERNS.some((pattern) => pattern.test(text));
}
