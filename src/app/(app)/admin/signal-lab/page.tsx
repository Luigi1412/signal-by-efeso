import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignalLabForm } from "@/components/admin/signal-lab-form";
import { OpenAiStatusBanner } from "@/components/admin/openai-status-banner";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled, isIntelligenceGenerationConfigured } from "@/server/ai/config";
import {
  getSignalLabContext,
  listExistingCandidatesForAnalysis,
} from "@/server/services/signal-extraction-service";

export const metadata: Metadata = { title: ui.admin.signalLab.title };
export const dynamic = "force-dynamic";

export default async function SignalLabPage() {
  if (!isControlledExtractionEnabled()) notFound();

  const context = await getSignalLabContext();
  const firstAnalysisId = context.analyses[0]?.id;
  const existingCandidates = firstAnalysisId ? await listExistingCandidatesForAnalysis(firstAnalysisId) : [];

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.signalLab.eyebrow}
        title={ui.admin.signalLab.headline}
        description={ui.admin.signalLab.description}
        className="mb-8"
      />
      <div className="mb-6">
        <OpenAiStatusBanner />
      </div>
      <SignalLabForm
        companies={context.companies}
        analyses={context.analyses}
        runsByAnalysis={context.runsByAnalysis}
        claimsByAnalysis={context.claimsByAnalysis}
        existingCandidates={existingCandidates}
        openaiConfigured={isIntelligenceGenerationConfigured()}
      />
    </PageContainer>
  );
}
