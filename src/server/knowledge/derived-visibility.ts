import "server-only";
import { loadMatchingCatalog } from "./matching-catalog";
import { listOpportunityKnowledge, listOpportunityFits, listOpportunityRationales } from "@/server/opportunities/persistence";
import { listActiveEfesoFitsForCompany } from "@/server/intelligence/persistence";

/** Legacy derived text can contain restricted names too. Hide the whole derivation, not just labels. */
export async function memberSafeOpportunity(workspaceId:string,companyId:string,opportunityId:string):Promise<boolean> {
  const [catalog,knowledge,fits,companyFits,rationales]=await Promise.all([loadMatchingCatalog(workspaceId),listOpportunityKnowledge(opportunityId),listOpportunityFits(opportunityId),listActiveEfesoFitsForCompany(workspaceId,companyId),listOpportunityRationales(opportunityId)]);
  if (!["operational_implication","potential_need","client_validation","next_step","uncertainty"].every(type=>rationales.some(r=>r.rationale_type===type&&r.statement.trim()))) return false;
  const safeIds=new Set(catalog.map(o=>o.id));
  if(knowledge.length===0||fits.length===0) return false;
  return knowledge.every(link=>safeIds.has(link.knowledge_object_id))&&fits.every(link=>{
    const fit=companyFits.find(f=>f.id===link.efeso_fit_id);return Boolean(fit&&safeIds.has(fit.knowledge_object_id));
  });
}
