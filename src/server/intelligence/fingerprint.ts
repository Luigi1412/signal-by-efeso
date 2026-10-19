import { sha256Json } from "@/server/extraction/sha256";
import type { AccountSignalInput, FitComponentDraft } from "./types";

export function computeAccountIntelligenceFingerprint(input: {
  companyId: string;
  signals: Pick<AccountSignalInput, "id" | "status">[];
}): string {
  const active = input.signals
    .filter((signal) => signal.status === "active")
    .map((signal) => signal.id)
    .sort();
  return sha256Json({ company_id: input.companyId, signal_ids: active });
}

export function computeEfesoFitFingerprint(input: {
  companyId: string;
  knowledgeObjectId: string;
  components: FitComponentDraft[];
  signalIds: string[];
}): string {
  return sha256Json({
    company_id: input.companyId,
    knowledge_object_id: input.knowledgeObjectId,
    components: input.components
      .map((row) => ({ type: row.componentType, value: row.componentValue, contribution: row.contribution }))
      .sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value)),
    signal_ids: [...input.signalIds].sort(),
  });
}
