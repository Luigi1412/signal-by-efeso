import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExtractionLabForm } from "@/components/admin/extraction-lab-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { OpenAiStatusBanner } from "@/components/admin/openai-status-banner";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { getExtractionLabContext } from "@/server/services/controlled-intelligence-extraction-service";

export const metadata: Metadata = { title: ui.admin.extractionLab.title };
export const dynamic = "force-dynamic";

export default async function ExtractionLabPage() {
  if (!isControlledExtractionEnabled()) notFound();

  const context = await getExtractionLabContext();

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.extractionLab.eyebrow}
        title={ui.admin.extractionLab.headline}
        description={ui.admin.extractionLab.description}
        className="mb-8"
      />
      <div className="mb-6">
        <OpenAiStatusBanner />
      </div>
      <ExtractionLabForm analyses={context.analyses} runsByAnalysis={context.runsByAnalysis} />
    </PageContainer>
  );
}
