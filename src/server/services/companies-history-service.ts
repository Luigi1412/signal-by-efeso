import "server-only";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { listResearchRunsForCompany, listWorkspaceCompanies } from "@/server/external-research/persistence";
import {
  deriveCompanyResearchOutcome,
  memberOutcomeListLabel,
  type ResearchOutcome,
} from "@/server/product/research-outcome";
import { requireAuthUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { listActiveOpportunities } from "@/server/opportunities/persistence";
import { listSignalsForWorkspace } from "@/server/signals/persistence";
import { getTraceabilityForCompany } from "@/server/services/evidence-foundation-service";

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

export interface CompanyHistoryRow {
  companyId: string;
  slug: string;
  name: string;
  industry: string | null;
  country: string | null;
  domain: string | null;
  lastResearchedAt: string | null;
  updatedAt: string | null;
  outcome: ResearchOutcome | null;
  outcomeLabel: string;
  runStatus: string | null;
  signalCount: number;
  opportunityCount: number;
  demoOnly: boolean;
}

export async function listCompanyHistory(): Promise<CompanyHistoryRow[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();

  const allowDemo = isDemoMode();
  const [companies, signals, opportunities] = await Promise.all([
    listWorkspaceCompanies(workspace.id),
    listSignalsForWorkspace(workspace.id),
    listActiveOpportunities(workspace.id),
  ]);

  const activeSignals = signals.filter((row) => row.status === "active");
  const activeOpportunities = opportunities.filter((row) => row.status === "active");

  const rows: CompanyHistoryRow[] = [];

  for (const company of companies) {
    const companySignals = activeSignals.filter((row) => row.company_id === company.id);
    const realSignals = companySignals.filter((row) => !isDemoOrigin(row.metadata));
    const demoSignals = companySignals.filter((row) => isDemoOrigin(row.metadata));
    const companyOpportunities = activeOpportunities.filter((row) => row.company_id === company.id);
    const realOpportunities = companyOpportunities.filter((row) => !isDemoOrigin(row.metadata));

    let runs: Awaited<ReturnType<typeof listResearchRunsForCompany>> = [];
    try {
      runs = await listResearchRunsForCompany(workspace.id, company.id);
    } catch {
      runs = [];
    }
    const latestRun = runs[0] ?? null;
    const hasRealResearch = runs.some((run) =>
      ["completed", "partial", "failed"].includes(run.status) || Boolean(run.resolved_company_id),
    );

    const demoOnly = !hasRealResearch && realSignals.length === 0 && demoSignals.length > 0;
    if (!allowDemo) {
      if (demoOnly) continue;
      if (!hasRealResearch && realSignals.length === 0 && realOpportunities.length === 0 && runs.length === 0) continue;
    }

    const visibleSignals = allowDemo ? companySignals : realSignals;
    const visibleOpportunities = allowDemo ? companyOpportunities : realOpportunities;

    let activeClaimCount = 0;
    try {
      const traces = await getTraceabilityForCompany(company.id);
      activeClaimCount = traces.filter(
        (trace) =>
          trace.claim.claim_status === "active" &&
          (trace.claim.verification_status === "supported" ||
            trace.claim.verification_status === "corroborated" ||
            trace.claim.claim_type === "fact"),
      ).length;
    } catch {
      activeClaimCount = 0;
    }

    const insufficient =
      latestRun?.resolution_payload &&
      typeof latestRun.resolution_payload === "object" &&
      (latestRun.resolution_payload as { insufficient_evidence_for_signal?: boolean }).insufficient_evidence_for_signal ===
        true;

    const outcome =
      latestRun || visibleSignals.length > 0 || activeClaimCount > 0
        ? deriveCompanyResearchOutcome({
            signalCount: visibleSignals.length,
            activeClaimCount,
            failureCode: latestRun?.failure_code ?? null,
            runStatus: latestRun?.status ?? (visibleSignals.length > 0 ? "completed" : null),
            insufficientEvidenceForSignal: Boolean(insufficient),
          })
        : null;

    rows.push({
      companyId: company.id,
      slug: company.slug,
      name: company.display_name,
      industry: company.industry,
      country: company.primary_country_code,
      domain: company.primary_domain,
      lastResearchedAt: latestRun?.completed_at ?? latestRun?.started_at ?? latestRun?.created_at ?? null,
      updatedAt: latestRun?.updated_at ?? null,
      outcome,
      outcomeLabel: memberOutcomeListLabel(outcome, latestRun?.status ?? null),
      runStatus: latestRun?.status ?? null,
      signalCount: visibleSignals.length,
      opportunityCount: visibleOpportunities.length,
      demoOnly,
    });
  }

  return rows.sort((a, b) => {
    const left = a.lastResearchedAt ?? a.updatedAt ?? "";
    const right = b.lastResearchedAt ?? b.updatedAt ?? "";
    return right.localeCompare(left) || a.name.localeCompare(b.name);
  });
}
