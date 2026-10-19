import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClaimRow } from "@/types/database";

export async function createClaim(input: {
  workspaceId: string;
  analysisId: string;
  originatingResearchRunId: string;
  companyId: string;
  entityId?: string | null;
  statement: string;
  claimCategory: ClaimRow["claim_category"];
  claimType?: ClaimRow["claim_type"];
  verificationStatus?: ClaimRow["verification_status"];
  reviewStatus?: ClaimRow["review_status"];
  claimStatus?: ClaimRow["claim_status"];
  geographyLevel?: ClaimRow["geography_level"];
  countryCode?: string | null;
  stateRegion?: string | null;
  city?: string | null;
  periodType?: ClaimRow["period_type"];
  periodStart?: string | null;
  periodEnd?: string | null;
  asOfDate?: string | null;
  metricName?: string | null;
  numericValue?: number | null;
  unit?: string | null;
  currencyCode?: string | null;
  scale?: ClaimRow["scale"];
  confidenceScore?: number | null;
  confidenceMethodVersion?: string | null;
  supersedesClaimId?: string | null;
}): Promise<ClaimRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claims")
    .insert({
      workspace_id: input.workspaceId,
      analysis_id: input.analysisId,
      originating_research_run_id: input.originatingResearchRunId,
      company_id: input.companyId,
      entity_id: input.entityId ?? null,
      statement: input.statement,
      claim_category: input.claimCategory,
      claim_type: input.claimType ?? "fact",
      verification_status: input.verificationStatus ?? "unverified",
      review_status: input.reviewStatus ?? "pending",
      claim_status: input.claimStatus ?? "active",
      geography_level: input.geographyLevel ?? null,
      country_code: input.countryCode ?? null,
      state_region: input.stateRegion ?? null,
      city: input.city ?? null,
      period_type: input.periodType ?? null,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      as_of_date: input.asOfDate ?? null,
      metric_name: input.metricName ?? null,
      numeric_value: input.numericValue ?? null,
      unit: input.unit ?? null,
      currency_code: input.currencyCode ?? null,
      scale: input.scale ?? null,
      confidence_score: input.confidenceScore ?? null,
      confidence_method_version: input.confidenceMethodVersion ?? null,
      supersedes_claim_id: input.supersedesClaimId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getClaimById(workspaceId: string, claimId: string): Promise<ClaimRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", claimId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClaimsForAnalysis(workspaceId: string, analysisId: string): Promise<ClaimRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getClaimsForCompany(workspaceId: string, companyId: string): Promise<ClaimRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("claim_status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findClaimByStatement(
  workspaceId: string,
  analysisId: string,
  statement: string,
): Promise<ClaimRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("analysis_id", analysisId)
    .eq("statement", statement)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function markClaimSuperseded(workspaceId: string, claimId: string): Promise<ClaimRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("claims")
    .update({ claim_status: "superseded" })
    .eq("workspace_id", workspaceId)
    .eq("id", claimId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
