import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EfesoFitLabForm } from "@/components/admin/efeso-fit-lab-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled, isIntelligenceGenerationConfigured } from "@/server/ai/config";
import { getEfesoFitLabContext, listExistingEfesoFitCandidates } from "@/server/services/efeso-fit-service";

export const metadata: Metadata = { title: ui.admin.efesoFitLab.title };
export const dynamic = "force-dynamic";

export default async function EfesoFitLabPage() {
  if (!isControlledExtractionEnabled()) notFound();

  const context = await getEfesoFitLabContext();
  const firstCompanyId = context.companies[0]?.id;
  const existingCandidates = firstCompanyId ? await listExistingEfesoFitCandidates(firstCompanyId) : [];

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.efesoFitLab.eyebrow}
        title={ui.admin.efesoFitLab.headline}
        description={ui.admin.efesoFitLab.description}
        className="mb-8"
      />
      <EfesoFitLabForm
        companies={context.companies}
        analyses={context.analyses}
        runsByAnalysis={context.runsByAnalysis}
        knowledgeObjects={context.knowledgeObjects}
        existingCandidates={existingCandidates}
        openaiConfigured={isIntelligenceGenerationConfigured()}
      />
    </PageContainer>
  );
}
