import { ListChecks } from "lucide-react";
import { CompanyActionPanel } from "@/components/actions/company-action-panel";
import { DemoBadge } from "@/components/shared/demo-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { ui } from "@/i18n";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { resolvePersistedCompanyId } from "@/server/services/account-query-service";
import { searchRecommendedActions, getRecommendedActionDetail } from "@/server/services/recommended-action-query-service";
import { getCompanyRelationship } from "@/server/services/relationship-query-service";
import type { RecommendedActionDetail } from "@/server/recommended-actions/types";
import type { AccountRelationshipView } from "@/server/relationship/types";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export const dynamic = "force-dynamic";

export default async function CompanyActionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  resolveWorkspace(slug);

  const actions: RecommendedActionDetail[] = [];
  let relationship: AccountRelationshipView | null = null;
  try {
    const persistedId = await resolvePersistedCompanyId(slug);
    if (persistedId) {
      relationship = await getCompanyRelationship(persistedId);
      const items = await searchRecommendedActions({ companyId: persistedId, status: "active" });
      for (const item of items) {
        const detail = await getRecommendedActionDetail(item.id);
        if (detail) actions.push(detail);
      }
    }
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={ui.actions.eyebrow}
        title={ui.actions.title}
        description={ui.actions.description}
        actions={<DemoBadge />}
      />
      {actions.length === 0 && !relationship ? (
        <EmptyState icon={ListChecks} title={ui.actions.emptyTitle} description={ui.actions.emptyDescription} />
      ) : (
        <CompanyActionPanel actions={actions} relationship={relationship} />
      )}
    </div>
  );
}
