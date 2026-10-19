import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ActionFeed } from "@/components/actions/action-feed";
import { EmptyState } from "@/components/shared/empty-state";
import { ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { searchRecommendedActions } from "@/server/services/recommended-action-query-service";
import { listCompaniesForWorkspace } from "@/server/signals/persistence";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import type { RecommendedActionListItem } from "@/server/recommended-actions/types";

export const metadata: Metadata = { title: ui.actions.globalTitle };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function GlobalActionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireEfesoAccess();
  const query = await searchParams;
  const filters = {
    companyId: first(query.company),
    actionType: first(query.type),
    priority: first(query.priority),
    confidence: first(query.confidence),
    relationshipStrength: first(query.strength),
  };
  let items: RecommendedActionListItem[] = [];
  let companies: { id: string; displayName: string }[] = [];
  let persistenceError = false;
  try {
    const workspace = await workspaceRepository.getCurrentWorkspace();
    items = await searchRecommendedActions({
      companyId: filters.companyId || null,
      actionType: filters.actionType || null,
      priority: filters.priority || null,
      status: "active",
      confidence: filters.confidence || null,
      relationshipStrength: filters.relationshipStrength || null,
    });
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
        eyebrow={ui.actions.globalEyebrow}
        title={ui.actions.globalTitle}
        description={ui.actions.globalDescription}
        className="mb-8"
      />
      {persistenceError ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <ActionFeed items={items} companies={companies} filters={filters} />
      )}
    </PageContainer>
  );
}
