import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { OpportunityFeed } from "@/components/opportunities/opportunity-feed";
import { EmptyState } from "@/components/shared/empty-state";
import { ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getOpportunityDetail, searchOpportunities } from "@/server/services/opportunity-query-service";
import { listCompaniesForWorkspace } from "@/server/signals/persistence";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import type { OpportunityDetail, OpportunityListItem } from "@/server/opportunities/types";

export const metadata: Metadata = { title: ui.opportunities.globalTitle };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function GlobalOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireEfesoAccess();
  const query = await searchParams;
  const filters = {
    query: first(query.q),
    companyId: first(query.company),
    opportunityType: first(query.type),
    relevanceLevel: first(query.relevance),
    urgencyLevel: first(query.urgency),
    maturity: first(query.maturity),
    confidenceTier: first(query.confidence),
    geography: first(query.geography),
  };
  const opportunityId = first(query.opportunity);

  let items: OpportunityListItem[] = [];
  let selected: OpportunityDetail | null = null;
  let companies: { id: string; displayName: string }[] = [];
  let persistenceError = false;
  try {
    const workspace = await workspaceRepository.getCurrentWorkspace();
    items = await searchOpportunities({
      query: filters.query || null,
      companyId: filters.companyId || null,
      opportunityType: filters.opportunityType || null,
      relevanceLevel: filters.relevanceLevel || null,
      urgencyLevel: filters.urgencyLevel || null,
      maturity: filters.maturity || null,
      confidenceTier: filters.confidenceTier || null,
      geography: filters.geography || null,
      status: "active",
    });
    selected = opportunityId ? await getOpportunityDetail(opportunityId) : null;
    companies = workspace
      ? (await listCompaniesForWorkspace(workspace.id)).map((row) => ({ id: row.id, displayName: row.display_name }))
      : [];
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.opportunities.globalEyebrow}
        title={ui.opportunities.globalTitle}
        description={ui.opportunities.globalDescription}
        className="mb-8"
      />
      {persistenceError ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <OpportunityFeed items={items} selected={selected} companies={companies} filters={filters} />
      )}
    </PageContainer>
  );
}
