import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpportunityLabForm } from "@/components/admin/opportunity-lab-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled, isIntelligenceGenerationConfigured } from "@/server/ai/config";
import { getOpportunityLabContext } from "@/server/services/opportunity-extraction-service";

export const metadata: Metadata = { title: ui.admin.opportunityLab.title };
export const dynamic = "force-dynamic";

export default async function OpportunityLabPage() {
  if (!isControlledExtractionEnabled()) notFound();

  const context = await getOpportunityLabContext();

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.opportunityLab.eyebrow}
        title={ui.admin.opportunityLab.headline}
        description={ui.admin.opportunityLab.description}
        className="mb-8"
      />
      <OpportunityLabForm
        companies={context.companies}
        analyses={context.analyses}
        runsByAnalysis={context.runsByAnalysis}
        existingByCompany={context.existingByCompany}
        contexts={context.contexts}
        openaiConfigured={isIntelligenceGenerationConfigured()}
      />
    </PageContainer>
  );
}
