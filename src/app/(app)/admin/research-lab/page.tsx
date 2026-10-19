import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { OpenAiStatusBanner } from "@/components/admin/openai-status-banner";
import { AdminResearchLab } from "@/components/admin/research-lab";
import { ui } from "@/i18n";
import { adminListResearchRunsAction } from "@/server/actions/external-research-actions";
import { getExternalResearchProviderName } from "@/server/external-research/config";
import { getLanguageModelProviderName, getOllamaExtractionModel } from "@/server/ai/config";

export const metadata: Metadata = { title: ui.admin.researchLab.title };
export const dynamic = "force-dynamic";

export default async function ResearchLabPage() {
  const { runs, eventsByRun, sourcesByRun } = await adminListResearchRunsAction();
  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.researchLab.eyebrow}
        title={ui.admin.researchLab.headline}
        description={ui.admin.researchLab.description}
        className="mb-8"
      />
      <div className="mb-6 space-y-2">
        <OpenAiStatusBanner />
        <p className="text-xs text-muted-foreground">
          Pesquisa: {getExternalResearchProviderName()} · Provider:{" "}
          {getLanguageModelProviderName() === "ollama" ? "Ollama" : getLanguageModelProviderName()}
          {getLanguageModelProviderName() === "ollama" && getOllamaExtractionModel()
            ? ` · Model: ${getOllamaExtractionModel()}`
            : ""}
        </p>
      </div>
      <AdminResearchLab runs={runs} eventsByRun={eventsByRun} sourcesByRun={sourcesByRun} />
    </PageContainer>
  );
}
