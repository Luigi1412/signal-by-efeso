import type { Metadata } from "next";
import { KnowledgeCatalogReview } from "@/components/admin/knowledge-catalog-review";
import { KnowledgeLabForm } from "@/components/admin/knowledge-lab-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { getKnowledgeLabContext } from "@/server/services/efeso-knowledge-extraction-service";
import { listKnowledgeGovernanceCatalog } from "@/server/services/efeso-knowledge-service";
import { EmptyState } from "@/components/shared/empty-state";
import { isPersistenceUnavailable } from "@/server/persistence-error";

export const metadata: Metadata = { title: ui.admin.knowledgeLab.title };
export const dynamic = "force-dynamic";

export default async function KnowledgeLabPage() {
  const extractionEnabled = isControlledExtractionEnabled();
  let catalog: Awaited<ReturnType<typeof listKnowledgeGovernanceCatalog>> = [];
  let extractionContext: Awaited<ReturnType<typeof getKnowledgeLabContext>> | null = null;
  let persistenceError = false;
  try {
    catalog = await listKnowledgeGovernanceCatalog();
    if (extractionEnabled) extractionContext = await getKnowledgeLabContext();
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.knowledgeLab.eyebrow}
        title={ui.admin.knowledgeLab.headline}
        description={ui.admin.knowledgeLab.description}
        className="mb-8"
      />
      {persistenceError ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <div className="flex flex-col gap-10">
          <KnowledgeCatalogReview objects={catalog} />
          {extractionEnabled && extractionContext ? (
            <KnowledgeLabForm
              analyses={extractionContext.analyses}
              runsByAnalysis={extractionContext.runsByAnalysis}
              snapshots={extractionContext.snapshots}
            />
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
