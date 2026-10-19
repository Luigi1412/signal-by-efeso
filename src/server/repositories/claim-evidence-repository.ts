import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClaimEvidenceRow } from "@/types/database";

export async function linkClaimEvidence(input: {
  workspaceId: string;
  claimId: string;
  evidenceFragmentId: string;
  relationship: ClaimEvidenceRow["relationship"];
  directness: ClaimEvidenceRow["directness"];
  relevanceScore?: number | null;
}): Promise<ClaimEvidenceRow> {
  const existing = await findLink(input);
  if (existing) return existing;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claim_evidence")
    .insert({
      workspace_id: input.workspaceId,
      claim_id: input.claimId,
      evidence_fragment_id: input.evidenceFragmentId,
      relationship: input.relationship,
      directness: input.directness,
      relevance_score: input.relevanceScore ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function findLink(input: {
  workspaceId: string;
  claimId: string;
  evidenceFragmentId: string;
  relationship: ClaimEvidenceRow["relationship"];
}): Promise<ClaimEvidenceRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claim_evidence")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("claim_id", input.claimId)
    .eq("evidence_fragment_id", input.evidenceFragmentId)
    .eq("relationship", input.relationship)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEvidenceForClaim(
  workspaceId: string,
  claimId: string,
): Promise<ClaimEvidenceRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claim_evidence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getEvidenceForClaims(
  workspaceId: string,
  claimIds: string[],
): Promise<ClaimEvidenceRow[]> {
  if (claimIds.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claim_evidence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("claim_id", claimIds);
  if (error) throw error;
  return data ?? [];
}
