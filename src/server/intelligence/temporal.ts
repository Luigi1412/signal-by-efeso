import type { TemporalState } from "./taxonomy";

const DAY_MS = 24 * 60 * 60 * 1000;

export function classifyTemporalState(input: {
  assertionMode: string;
  signalNature: string;
  eventDate: string | null;
  now?: Date;
}): TemporalState {
  const mode = input.assertionMode;
  if (mode === "planned") return "planned";
  if (mode === "expected") return "expected";
  if (mode === "target") return "target";

  const now = input.now ?? new Date();
  const event = parseDate(input.eventDate);
  if (mode === "reported_actual" && event && now.getTime() - event.getTime() > 365 * DAY_MS) {
    return "historical";
  }
  if (event && now.getTime() - event.getTime() > 365 * DAY_MS) return "historical";
  if (input.signalNature === "state") return "ongoing";
  if (event && now.getTime() - event.getTime() <= 180 * DAY_MS) return "recent";
  if (mode === "announced" || mode === "reported_actual") return "recent";
  return "ongoing";
}

export function recencyScore(eventDate: string | null, createdAt: string, now = new Date()): number {
  const date = parseDate(eventDate) ?? parseDate(createdAt);
  if (!date) return 0;
  const ageDays = (now.getTime() - date.getTime()) / DAY_MS;
  if (ageDays <= 180) return 2;
  if (ageDays <= 365) return 1;
  return 0;
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
