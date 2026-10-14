import type { Metadata } from "next";
import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";

export const metadata: Metadata = { title: ui.newAnalysis.title };

export default function NewAnalysisPage() {
  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow={ui.newAnalysis.title}
        title={ui.newAnalysis.headline}
        description={ui.newAnalysis.description}
        className="mb-8"
      />
      <NewAnalysisForm />
    </PageContainer>
  );
}
