import { Suspense } from "react";
import { CompanySourceReview } from "@/components/research/company-source-review";
import { EvidenceExplorer } from "@/components/evidence/evidence-explorer";
import { DemoBadge } from "@/components/shared/demo-badge";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { ui } from "@/i18n";
import { toPersistedEvidenceClaims } from "@/lib/claim-presentation";
import { deriveEvidenceSummary } from "@/lib/evidence-summary";
import { parseEvidenceFilter } from "@/lib/evidence-filters";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { resolvePersistedCompanyId } from "@/server/services/account-query-service";
import { getTraceabilityForCompany } from "@/server/services/evidence-foundation-service";
import type { EvidenceClaim } from "@/types";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export const dynamic = "force-dynamic";

export default async function EvidencePage({ params, searchParams }: PageProps<"/companies/[slug]/evidence">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { company } = resolveWorkspace(slug);
  const initialFilter = parseEvidenceFilter(query.filter);
  const claimParam = Array.isArray(query.claim) ? query.claim[0] : query.claim;

  let claims: EvidenceClaim[] = [];
  let notice: string | undefined;
  try {
    const persistedId = await resolvePersistedCompanyId(slug);
    if (persistedId) {
      const traces = await getTraceabilityForCompany(persistedId);
      claims = toPersistedEvidenceClaims(traces);
    }
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    notice = ui.persistence.unavailable;
  }

  if (claims.length === 0 && !notice) {
    notice = ui.evidence.emptyPersisted;
  }

  const summary = deriveEvidenceSummary(claims);
  const initialClaimId = claims.some((claim) => claim.id === claimParam) ? (claimParam as string) : null;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={ui.evidence.eyebrow}
        title={ui.evidence.title}
        description={ui.evidence.description}
        actions={<DemoBadge />}
      />

      {notice ? <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{notice}</p> : null}
      <CompanySourceReview slug={slug} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard compact value={String(summary.verifiedClaims)} label={ui.evidence.verifiedClaims} type="verified" />
        <MetricCard compact value={String(summary.derivedMetrics)} label={ui.evidence.derivedMetrics} type="derived" />
        <MetricCard compact value={String(summary.hypotheses)} label={ui.evidence.hypotheses} type="hypothesis" />
        <MetricCard compact value={String(summary.conflicts)} label={ui.evidence.conflicts} type="conflict" />
        <MetricCard compact value={String(summary.sourcesRetained)} label={ui.evidence.sourcesRetained} className="col-span-2 sm:col-span-1" />
      </div>

      <Suspense fallback={<div className="h-40 rounded-lg border bg-card" />}>
        <EvidenceExplorer
          key={`persisted-${company.slug}-${initialFilter}-${initialClaimId ?? "none"}`}
          companySlug={company.slug}
          claims={claims}
          conflicts={[]}
          signals={[]}
          initialFilter={initialFilter}
          initialClaimId={initialClaimId}
        />
      </Suspense>
    </div>
  );
}
