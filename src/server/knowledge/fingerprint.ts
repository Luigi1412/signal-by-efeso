import { sha256Json } from "@/server/extraction/sha256";
import { coreKnowledgeName, type KnowledgeObjectType } from "./taxonomy";

export function computeKnowledgeCandidateFingerprint(input: {
  workspaceId: string;
  objectType: KnowledgeObjectType | string;
  canonicalName: string;
}): string {
  return sha256Json({
    workspace_id: input.workspaceId,
    object_type: input.objectType,
    core_name: coreKnowledgeName(input.canonicalName),
  });
}
