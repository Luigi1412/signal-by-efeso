import { sha256Json } from "@/server/extraction/sha256";
import { coreEventPhrase, normalizeSignalText } from "./taxonomy";

export function computeSignalFingerprint(input: {
  companyId: string;
  signalType: string;
  coreEvent: string;
  geography: string | null;
  eventDate: string | null;
  periodStart: string | null;
  numericValue: number | null;
  unit: string | null;
}): string {
  return sha256Json({
    company_id: input.companyId,
    signal_type: input.signalType,
    core_event: coreEventPhrase(input.coreEvent),
    geography: input.geography ? normalizeSignalText(input.geography) : null,
    event_date: input.eventDate,
    period_start: input.periodStart,
    magnitude: input.numericValue,
    unit: input.unit ? normalizeSignalText(input.unit) : null,
  });
}
