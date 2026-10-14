import { Target } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { DemoNotice } from "@/components/shared/demo-notice";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { WorkspaceUnavailable } from "@/components/workspace/workspace-unavailable";
import { getOpportunitiesForCompany } from "@/data";
import { t, ui } from "@/i18n";
import { opportunityStrengthBand } from "@/lib/labels";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export default async function OpportunitiesPage({ params }: PageProps<"/companies/[slug]/opportunities">) {
  const { slug } = await params;
  const { company, analysis } = resolveWorkspace(slug);

  if (!analysis) {
    return <WorkspaceUnavailable company={company} section={ui.workspace.tabs.opportunities} />;
  }

  const opportunities = getOpportunitiesForCompany(company.id);
  const highCount = opportunities.filter((o) => opportunityStrengthBand(o.score) === "forte").length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={ui.opportunities.eyebrow}
        title={ui.opportunities.title}
        description={t(ui.opportunities.description, { count: opportunities.length, high: highCount })}
        actions={<DemoNotice inline />}
      />

      {opportunities.length === 0 ? (
        <EmptyState
          icon={Target}
          title={ui.opportunities.emptyTitle}
          description={ui.opportunities.emptyDescription}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} companySlug={company.slug} />
          ))}
        </div>
      )}
    </div>
  );
}
