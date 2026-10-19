import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountIntelligenceLabForm } from "@/components/admin/account-intelligence-lab-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled, isIntelligenceGenerationConfigured } from "@/server/ai/config";
import {
  getAccountIntelligenceLabContext,
  listExistingAccountIntelligenceCandidates,
} from "@/server/services/account-intelligence-service";

export const metadata: Metadata = { title: ui.admin.accountIntelligenceLab.title };
export const dynamic = "force-dynamic";

export default async function AccountIntelligenceLabPage() {
  if (!isControlledExtractionEnabled()) notFound();

  const context = await getAccountIntelligenceLabContext();
  const firstCompanyId = context.companies[0]?.id;
  const existingCandidates = firstCompanyId ? await listExistingAccountIntelligenceCandidates(firstCompanyId) : [];

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.accountIntelligenceLab.eyebrow}
        title={ui.admin.accountIntelligenceLab.headline}
        description={ui.admin.accountIntelligenceLab.description}
        className="mb-8"
      />
      <AccountIntelligenceLabForm
        companies={context.companies}
        analyses={context.analyses}
        runsByAnalysis={context.runsByAnalysis}
        existingCandidates={existingCandidates}
        openaiConfigured={isIntelligenceGenerationConfigured()}
      />
    </PageContainer>
  );
}
