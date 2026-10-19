import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { NewResearchForm } from "@/components/research/new-research-form";
import { ui } from "@/i18n";

export const metadata: Metadata = { title: ui.newAnalysis.title };
export const dynamic = "force-dynamic";

export default function NewResearchPage() {
  return (
    <PageContainer width="narrow">
      <PageHeader title={ui.newAnalysis.headline} description={ui.newAnalysis.description} className="mb-8" />
      <NewResearchForm />
    </PageContainer>
  );
}
