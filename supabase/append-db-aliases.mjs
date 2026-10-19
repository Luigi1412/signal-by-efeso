import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/types/database.ts");
const marker = "export type AnalysisRecord =";
const aliases = `
/** Convenience aliases. Distinct from frontend/demo intelligence domain types. */
export type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"]
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type WorkspaceMembershipRow = Database["public"]["Tables"]["workspace_memberships"]["Row"]
export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"]
export type CompanyEntityRow = Database["public"]["Tables"]["company_entities"]["Row"]
export type AnalysisRecord = Database["public"]["Tables"]["analyses"]["Row"]
export type ResearchRunRecord = Database["public"]["Tables"]["research_runs"]["Row"]
export type SourceRow = Database["public"]["Tables"]["sources"]["Row"]
export type ResearchRunSourceRow = Database["public"]["Tables"]["research_run_sources"]["Row"]
export type SourceSnapshotRow = Database["public"]["Tables"]["source_snapshots"]["Row"]
export type EvidenceFragmentRow = Database["public"]["Tables"]["evidence_fragments"]["Row"]
export type ClaimRow = Database["public"]["Tables"]["claims"]["Row"]
export type ClaimEvidenceRow = Database["public"]["Tables"]["claim_evidence"]["Row"]
export type SourceContentBlockRow = Database["public"]["Tables"]["source_content_blocks"]["Row"]
export type ModelRunRow = Database["public"]["Tables"]["model_runs"]["Row"]
export type ClaimCandidateRow = Database["public"]["Tables"]["claim_candidates"]["Row"]
export type ClaimCandidateEvidenceRow = Database["public"]["Tables"]["claim_candidate_evidence"]["Row"]
export type ClaimCandidateValidationRow = Database["public"]["Tables"]["claim_candidate_validations"]["Row"]
export type KnowledgeTagRow = Database["public"]["Tables"]["knowledge_tags"]["Row"]
export type KnowledgeCandidateRow = Database["public"]["Tables"]["knowledge_candidates"]["Row"]
export type KnowledgeCandidateEvidenceRow = Database["public"]["Tables"]["knowledge_candidate_evidence"]["Row"]
export type KnowledgeCandidateValidationRow = Database["public"]["Tables"]["knowledge_candidate_validations"]["Row"]
export type EfesoKnowledgeObjectRow = Database["public"]["Tables"]["efeso_knowledge_objects"]["Row"]
export type KnowledgeObjectAliasRow = Database["public"]["Tables"]["knowledge_object_aliases"]["Row"]
export type KnowledgeObjectTagRow = Database["public"]["Tables"]["knowledge_object_tags"]["Row"]
export type KnowledgeObjectClaimRow = Database["public"]["Tables"]["knowledge_object_claims"]["Row"]
export type KnowledgeObjectRelationRow = Database["public"]["Tables"]["knowledge_object_relations"]["Row"]
export type AccessAuditEventRow = Database["public"]["Tables"]["access_audit_events"]["Row"]
`;

const current = readFileSync(target, "utf8");
if (!current.includes(marker)) {
  writeFileSync(target, `${current.trimEnd()}\n${aliases}`);
}
