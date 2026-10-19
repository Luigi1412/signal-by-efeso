import { Target } from "lucide-react";
import { CompanyOpportunityPanel } from "@/components/opportunities/company-opportunity-panel";
import { DemoBadge } from "@/components/shared/demo-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { t, ui } from "@/i18n";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getCompanyOpportunities } from "@/server/services/opportunity-query-service";
import { resolvePersistedCompanyId } from "@/server/services/account-query-service";
import type { OpportunityDetail } from "@/server/opportunities/types";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({ params }: PageProps<"/companies/[slug]/opportunities">) {
  const { slug } = await params;
  const { company } = resolveWorkspace(slug);

  let opportunities: OpportunityDetail[] = [];
  try {
    const persistedId = await resolvePersistedCompanyId(slug);
    if (persistedId) opportunities = await getCompanyOpportunities(persistedId);
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
  }

  const highCount = opportunities.filter((item) => item.relevanceLevel === "high").length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={ui.opportunities.eyebrow}
        title={ui.opportunities.title}
        description={t(ui.opportunities.description, { count: opportunities.length, high: highCount })}
        actions={<DemoBadge />}
      />
      {opportunities.length === 0 ? (
        <EmptyState icon={Target} title={ui.opportunities.emptyTitle} description={ui.opportunities.emptyDescription} />
      ) : (
        <CompanyOpportunityPanel opportunities={opportunities} companySlug={company.slug} />
      )}
    </div>
  );
}
