import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { PIPELINE_VERSION, RESEARCH_POLICY_VERSION } from "@/server/constants";
import type { ExternalResearchRunRow, ExternalResearchStatus, ExternalSourceCandidateRow, SourceCandidateStatus } from "./types";

function db() {
  return createPipelineAdminClient();
}

export async function insertResearchRun(input: {
  workspaceId: string;
  query: string;
  normalizedQuery: string;
  country: string | null;
  industry: string | null;
  horizon: number;
  createdBy: string;
}): Promise<ExternalResearchRunRow> {
  const { data, error } = await db()
    .from("external_research_runs")
    .insert({
      workspace_id: input.workspaceId,
      requested_query: input.query,
      normalized_query: input.normalizedQuery,
      requested_country: input.country,
      requested_industry: input.industry,
      time_horizon_months: input.horizon,
      status: "queued",
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ExternalResearchRunRow;
}

export async function getResearchRun(workspaceId: string, runId: string): Promise<ExternalResearchRunRow | null> {
  const { data, error } = await db()
    .from("external_research_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  return (data as ExternalResearchRunRow | null) ?? null;
}

export async function listResearchRunsForCompany(workspaceId: string, companyId: string): Promise<ExternalResearchRunRow[]> {
  const { data, error } = await db()
    .from("external_research_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("resolved_company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as ExternalResearchRunRow[];
}

export async function listResearchRuns(workspaceId: string, limit = 50): Promise<ExternalResearchRunRow[]> {
  const { data, error } = await db()
    .from("external_research_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExternalResearchRunRow[];
}

export async function updateResearchRun(
  workspaceId: string,
  runId: string,
  patch: Partial<ExternalResearchRunRow>,
): Promise<ExternalResearchRunRow> {
  const { data, error } = await db()
    .from("external_research_runs")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", runId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ExternalResearchRunRow;
}

export async function countConcurrentRuns(workspaceId: string): Promise<number> {
  const { count, error } = await db()
    .from("external_research_runs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", [
      "queued",
      "resolving_entity",
      "discovering_sources",
      "reviewing_sources",
      "ingesting_sources",
      "extracting_claims",
      "generating_signals",
      "generating_intelligence",
      "generating_opportunities",
      "generating_actions",
    ]);
  if (error) throw error;
  return count ?? 0;
}

export async function countUserRunsSince(workspaceId: string, userId: string, sinceIso: string): Promise<number> {
  const { count, error } = await db()
    .from("external_research_runs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("created_by", userId)
    .gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

const WORKER_ACTIVE_STATUSES: ExternalResearchStatus[] = [
  "queued",
  "resolving_entity",
  "discovering_sources",
  "reviewing_sources",
  "ingesting_sources",
  "extracting_claims",
  "generating_signals",
  "generating_intelligence",
  "generating_opportunities",
  "generating_actions",
];

/** List runs eligible for background worker ticks (lock expired or unset). */
export async function listEligibleResearchRunsForWorker(limit = 8): Promise<ExternalResearchRunRow[]> {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("external_research_runs")
    .select("*")
    .in("status", WORKER_ACTIVE_STATUSES)
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${now}`)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExternalResearchRunRow[];
}

/**
 * Safe DB lock: only one worker owns a run until lock expires.
 * Returns the row when claimed; null if another worker holds the lock.
 */
export async function claimResearchRunForWorker(
  runId: string,
  workerId: string,
  lockMs = 120_000,
): Promise<ExternalResearchRunRow | null> {
  const now = new Date();
  const until = new Date(now.getTime() + lockMs).toISOString();
  const nowIso = now.toISOString();
  const { data: current, error: loadError } = await db()
    .from("external_research_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!current) return null;
  const row = current as ExternalResearchRunRow;
  if (!WORKER_ACTIVE_STATUSES.includes(row.status)) return null;
  if (row.worker_lock_until && row.worker_lock_until > nowIso && row.worker_id && row.worker_id !== workerId) {
    return null;
  }
  const { data, error } = await db()
    .from("external_research_runs")
    .update({
      worker_id: workerId,
      worker_lock_until: until,
      worker_heartbeat_at: nowIso,
    })
    .eq("id", runId)
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${nowIso},worker_id.eq.${workerId}`)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as ExternalResearchRunRow | null) ?? null;
}

export async function releaseResearchRunWorkerLock(runId: string, workerId: string): Promise<void> {
  await db()
    .from("external_research_runs")
    .update({
      worker_id: null,
      worker_lock_until: null,
      worker_heartbeat_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("worker_id", workerId);
}

export async function heartbeatResearchRunWorker(runId: string, workerId: string, lockMs = 120_000): Promise<void> {
  const until = new Date(Date.now() + lockMs).toISOString();
  await db()
    .from("external_research_runs")
    .update({
      worker_lock_until: until,
      worker_heartbeat_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("worker_id", workerId);
}

export async function insertSourceCandidates(
  rows: Array<{
    workspaceId: string;
    researchRunId: string;
    url: string;
    normalizedUrl: string;
    title: string | null;
    publisher: string;
    sourceType: string;
    sourceTier: number;
    sourceQuality: string;
    publishedAt: string | null;
    status: SourceCandidateStatus;
    rejectionReason: string | null;
    canonicalUrl: string | null;
  }>,
): Promise<ExternalSourceCandidateRow[]> {
  if (rows.length === 0) return [];
  const { data, error } = await db()
    .from("external_source_candidates")
    .upsert(
      rows.map((row) => ({
        workspace_id: row.workspaceId,
        research_run_id: row.researchRunId,
        url: row.url,
        normalized_url: row.normalizedUrl,
        title: row.title,
        publisher: row.publisher,
        source_type: row.sourceType,
        source_tier: row.sourceTier,
        source_quality: row.sourceQuality,
        published_at: row.publishedAt,
        status: row.status,
        rejection_reason: row.rejectionReason,
        canonical_url: row.canonicalUrl,
      })),
      { onConflict: "research_run_id,normalized_url" },
    )
    .select("*");
  if (error) throw error;
  return (data ?? []) as ExternalSourceCandidateRow[];
}

export async function listSourceCandidates(runId: string): Promise<ExternalSourceCandidateRow[]> {
  const { data, error } = await db()
    .from("external_source_candidates")
    .select("*")
    .eq("research_run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ExternalSourceCandidateRow[];
}

export async function updateSourceCandidate(
  id: string,
  patch: Partial<ExternalSourceCandidateRow>,
): Promise<void> {
  const { error } = await db().from("external_source_candidates").update(patch).eq("id", id);
  if (error) throw error;
}

export async function insertResearchEvent(input: {
  workspaceId: string;
  researchRunId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  actorUserId?: string | null;
}): Promise<void> {
  await db().from("external_research_events").insert({
    workspace_id: input.workspaceId,
    research_run_id: input.researchRunId,
    event_type: input.eventType,
    payload: input.payload ?? {},
    actor_user_id: input.actorUserId ?? null,
  });
}

export async function listCompanyAliases(workspaceId: string): Promise<{ company_id: string; alias: string }[]> {
  const { data, error } = await db().from("company_aliases").select("company_id, alias").eq("workspace_id", workspaceId);
  if (error) throw error;
  return (data ?? []) as { company_id: string; alias: string }[];
}

export function isTerminalStatus(status: ExternalResearchStatus): boolean {
  return status === "completed" || status === "partial" || status === "failed" || status === "cancelled" || status === "needs_user_resolution";
}

export async function transitionRun(
  workspaceId: string,
  runId: string,
  from: ExternalResearchStatus | ExternalResearchStatus[],
  patch: Partial<ExternalResearchRunRow> & { status: ExternalResearchStatus },
): Promise<ExternalResearchRunRow | null> {
  let query = db()
    .from("external_research_runs")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", runId);
  query = Array.isArray(from) ? query.in("status", from) : query.eq("status", from);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  return (data as ExternalResearchRunRow | null) ?? null;
}

export async function listWorkspaceCompanies(workspaceId: string): Promise<
  {
    id: string;
    slug: string;
    display_name: string;
    primary_domain: string | null;
    primary_country_code: string | null;
    industry: string | null;
  }[]
> {
  const { data, error } = await db()
    .from("companies")
    .select("id, slug, display_name, primary_domain, primary_country_code, industry")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    slug: string;
    display_name: string;
    primary_domain: string | null;
    primary_country_code: string | null;
    industry: string | null;
  }[];
}

export async function insertCompany(input: {
  workspaceId: string;
  slug: string;
  displayName: string;
  domain: string | null;
  country: string | null;
  industry: string | null;
}): Promise<{ id: string; slug: string }> {
  const { data, error } = await db()
    .from("companies")
    .insert({
      workspace_id: input.workspaceId,
      slug: input.slug,
      display_name: input.displayName,
      primary_domain: input.domain,
      primary_website_url: input.domain ? `https://${input.domain}` : null,
      primary_country_code: input.country && input.country.length === 2 ? input.country : null,
      industry: input.industry,
      resolution_status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

export async function insertCompanyAlias(workspaceId: string, companyId: string, alias: string): Promise<void> {
  await db().from("company_aliases").upsert(
    { workspace_id: workspaceId, company_id: companyId, alias: alias.trim().toLowerCase() },
    { onConflict: "workspace_id,alias" },
  );
}

export async function updateCompanyIdentity(input: {
  workspaceId: string;
  companyId: string;
  displayName: string;
  domain: string | null;
  country: string | null;
  industry: string | null;
}): Promise<void> {
  const { error } = await db()
    .from("companies")
    .update({
      display_name: input.displayName,
      primary_domain: input.domain,
      primary_website_url: input.domain ? `https://${input.domain}` : null,
      primary_country_code: input.country && input.country.length === 2 ? input.country : null,
      industry: input.industry,
      resolution_status: "resolved",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.companyId);
  if (error) throw error;
}

export async function insertAnalysis(input: {
  workspaceId: string;
  companyId: string;
  userId: string;
  title: string;
  country: string | null;
}): Promise<{ id: string }> {
  const { data, error } = await db()
    .from("analyses")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      created_by_user_id: input.userId,
      title: input.title,
      status: "researching",
      analysis_type: "general_opportunity_scan",
      research_focus: "general",
      primary_country_code: input.country && input.country.length === 2 ? input.country : "BR",
      ui_locale: "pt-BR",
      report_locale: "pt-BR",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function insertLegacyResearchRun(input: {
  workspaceId: string;
  analysisId: string;
  userId: string;
  runType?: "initial" | "revalidation";
}): Promise<{ id: string }> {
  const { data, error } = await db()
    .from("research_runs")
    .insert({
      workspace_id: input.workspaceId,
      analysis_id: input.analysisId,
      requested_by_user_id: input.userId,
      run_type: input.runType ?? "initial",
      status: "researching",
      current_stage: "entity_resolution",
      progress_percent: 5,
      pipeline_version: PIPELINE_VERSION,
      research_policy_version: RESEARCH_POLICY_VERSION,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function completeLegacyResearchRun(workspaceId: string, runId: string, failed = false): Promise<void> {
  await db()
    .from("research_runs")
    .update({
      status: failed ? "failed" : "completed",
      progress_percent: failed ? 40 : 100,
      completed_at: new Date().toISOString(),
      current_stage: failed ? "source_retrieval" : "quality_gate",
    })
    .eq("workspace_id", workspaceId)
    .eq("id", runId);
}

export async function markAnalysisReady(workspaceId: string, analysisId: string): Promise<void> {
  await db().from("analyses").update({ status: "ready" }).eq("workspace_id", workspaceId).eq("id", analysisId);
}

export async function updateCompanyLastResearched(workspaceId: string, companyId: string): Promise<void> {
  await db()
    .from("companies")
    .update({ last_researched_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", companyId);
}

export async function listResearchEvents(runId: string): Promise<{ event_type: string; payload: Record<string, unknown>; created_at: string }[]> {
  const { data, error } = await db()
    .from("external_research_events")
    .select("event_type, payload, created_at")
    .eq("research_run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { event_type: string; payload: Record<string, unknown>; created_at: string }[];
}

export async function countPromotedPipeline(workspaceId: string, companyId: string, analysisId: string) {
  const claims = await db()
    .from("claims")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("analysis_id", analysisId);
  const signals = await db()
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  const opportunities = await db()
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  const pending = await db()
    .from("claim_candidates")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", analysisId)
    .eq("status", "pending_validation");
  const intelligence = await db()
    .from("account_intelligence")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  return {
    claims: claims.count ?? 0,
    signals: signals.count ?? 0,
    opportunities: opportunities.count ?? 0,
    pendingFacts: pending.count ?? 0,
    intelligence: intelligence.count ?? 0,
  };
}

export async function listActiveMetricClaims(workspaceId: string, companyId: string) {
  const { data, error } = await db()
    .from("claims")
    .select("id, metric_name, numeric_value, period_start, period_end, as_of_date")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("claim_status", "active");
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    metric_name: string | null;
    numeric_value: number | null;
    period_start: string | null;
    period_end: string | null;
    as_of_date: string | null;
  }[];
}

export async function markClaimsPotentialConflict(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db().from("claims").update({ review_status: "needs_review" }).in("id", ids);
}

export async function getCompanyLastResearched(workspaceId: string, companyId: string): Promise<string | null> {
  const { data, error } = await db()
    .from("companies")
    .select("last_researched_at")
    .eq("workspace_id", workspaceId)
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data || typeof data !== "object" || !("last_researched_at" in data)) return null;
  const value = (data as { last_researched_at: string | null }).last_researched_at;
  return value ?? null;
}

export async function getCompanySlug(workspaceId: string, companyId: string): Promise<string | null> {
  const { data, error } = await db().from("companies").select("slug").eq("workspace_id", workspaceId).eq("id", companyId).maybeSingle();
  if (error) throw error;
  return data && typeof data === "object" && "slug" in data ? String((data as { slug: string }).slug) : null;
}
