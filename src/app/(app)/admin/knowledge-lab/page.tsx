import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KnowledgeLabForm } from "@/components/admin/knowledge-lab-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { getKnowledgeLabContext } from "@/server/services/efeso-knowledge-extraction-service";

export const metadata: Metadata = { title: ui.admin.knowledgeLab.title };
export const dynamic = "force-dynamic";

export default async function KnowledgeLabPage() {
  if (!isControlledExtractionEnabled()) notFound();

  const context = await getKnowledgeLabContext();

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.knowledgeLab.eyebrow}
        title={ui.admin.knowledgeLab.headline}
        description={ui.admin.knowledgeLab.description}
        className="mb-8"
      />
      <KnowledgeLabForm
        analyses={context.analyses}
        runsByAnalysis={context.runsByAnalysis}
        snapshots={context.snapshots}
      />
    </PageContainer>
  );
}
