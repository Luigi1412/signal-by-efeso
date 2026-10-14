import { EvidenceExplorer } from "@/components/evidence/evidence-explorer";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { WorkspaceUnavailable } from "@/components/workspace/workspace-unavailable";
import { getClaimsForCompany, getConflictsForCompany, getEvidenceSummaryForCompany, getSignalsForCompany } from "@/data";
import { ui } from "@/i18n";
import { parseEvidenceFilter } from "@/lib/evidence-filters";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export default async function EvidencePage({ params, searchParams }: PageProps<"/companies/[slug]/evidence">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { company, analysis } = resolveWorkspace(slug);

  if (!analysis) {
    return <WorkspaceUnavailable company={company} section={ui.workspace.tabs.evidence} />;
  }

  const claims = getClaimsForCompany(company.id);
  const conflicts = getConflictsForCompany(company.id);
  const signals = getSignalsForCompany(company.id);
  const summary = getEvidenceSummaryForCompany(company.id);

  const initialFilter = parseEvidenceFilter(query.filter);
  const claimParam = Array.isArray(query.claim) ? query.claim[0] : query.claim;
  const initialClaimId = claims.some((c) => c.id === claimParam) ? (claimParam as string) : null;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={ui.evidence.eyebrow}
        title={ui.evidence.title}
        description={ui.evidence.description}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard compact value={String(summary.verifiedClaims)} label={ui.evidence.verifiedClaims} type="verified" />
        <MetricCard compact value={String(summary.derivedMetrics)} label={ui.evidence.derivedMetrics} type="derived" />
        <MetricCard compact value={String(summary.hypotheses)} label={ui.evidence.hypotheses} type="hypothesis" />
        <MetricCard compact value={String(summary.conflicts)} label={ui.evidence.conflicts} type="conflict" />
        <MetricCard compact value={String(summary.sourcesRetained)} label={ui.evidence.sourcesRetained} className="col-span-2 sm:col-span-1" />
      </div>

      <EvidenceExplorer
        key={`${initialFilter}-${initialClaimId ?? "none"}`}
        companySlug={company.slug}
        claims={claims}
        conflicts={conflicts}
        signals={signals}
        initialFilter={initialFilter}
        initialClaimId={initialClaimId}
      />
    </div>
  );
}
