import { isMemberVisibleKnowledge } from "./governance";
import type { KnowledgeObjectRow } from "./persistence";
export function memberSafeKnowledge(object: KnowledgeObjectRow): boolean {
  return object.metadata?.origin !== "demo_seed" && isMemberVisibleKnowledge({
    visibilityLevel:object.visibility_level??"admin_only",confidentialityLevel:object.confidentiality_level??"confidential",
    approvedForDisplay:object.approved_for_display===true,commercialTermsPresent:object.commercial_terms_present!==false,
    knowledgeNature:object.knowledge_nature??"commercial_claim",
  });
}
