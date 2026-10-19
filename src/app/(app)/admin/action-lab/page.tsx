import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLabForm } from "@/components/admin/action-lab-form";
import { OpenAiStatusBanner } from "@/components/admin/openai-status-banner";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { relationshipStatusLabel, relationshipStrengthLabel } from "@/lib/action-display";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled, isIntelligenceGenerationConfigured } from "@/server/ai/config";
import { getActionLabContext, listExistingActionCandidates } from "@/server/services/recommended-action-extraction-service";
import { getCompanyRelationship } from "@/server/services/relationship-query-service";
import { searchOpportunities } from "@/server/services/opportunity-query-service";

export const metadata: Metadata = { title: ui.admin.actionLab.title };
export const dynamic = "force-dynamic";

export default async function ActionLabPage() {
  if (!isControlledExtractionEnabled()) notFound();
  const context = await getActionLabContext();
  const firstCompanyId = context.companies[0]?.id;
  const existingCandidates = firstCompanyId ? await listExistingActionCandidates(firstCompanyId) : [];
  const opportunities = firstCompanyId ? await searchOpportunities({ companyId: firstCompanyId, status: "active" }) : [];
  const relationship = firstCompanyId ? await getCompanyRelationship(firstCompanyId) : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.actionLab.eyebrow}
        title={ui.admin.actionLab.headline}
        description={ui.admin.actionLab.description}
        className="mb-8"
      />
      <div className="mb-6">
        <OpenAiStatusBanner />
      </div>
      <ActionLabForm
        companies={context.companies}
        analyses={context.analyses}
        runsByAnalysis={context.runsByAnalysis}
        existingCandidates={existingCandidates}
        opportunityTitles={opportunities.map((item) => item.title)}
        relationshipSummary={
          relationship?.unavailable
            ? ui.relationship.unavailable
            : `${relationshipStatusLabel(relationship?.relationshipStatus ?? "unknown")} / ${relationshipStrengthLabel(relationship?.derivedStrength ?? "unknown")}`
        }
        openaiConfigured={isIntelligenceGenerationConfigured()}
      />
    </PageContainer>
  );
}
