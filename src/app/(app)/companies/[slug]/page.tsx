import Link from "next/link";
import { OpportunitySnapshotCard } from "@/components/opportunities/opportunity-snapshot-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { AnalysisHealth } from "@/components/workspace/overview/analysis-health";
import { BrazilFootprint } from "@/components/workspace/overview/brazil-footprint";
import { ExecutiveSignal } from "@/components/workspace/overview/executive-signal";
import { WhyNow } from "@/components/workspace/overview/why-now";
import { WorkspaceUnavailable } from "@/components/workspace/workspace-unavailable";
import { getOpportunitiesForCompany } from "@/data";
import { ui } from "@/i18n";
import { opportunityStrengthBand } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export default async function CompanyOverviewPage({ params }: PageProps<"/companies/[slug]">) {
  const { slug } = await params;
  const { company, analysis } = resolveWorkspace(slug);

  if (!analysis) {
    return <WorkspaceUnavailable company={company} section={ui.workspace.tabs.overview} />;
  }

  const opportunities = getOpportunitiesForCompany(company.id);

  return (
    <div className="flex flex-col gap-10">
      <ExecutiveSignal content={analysis.executiveSignal} />

      <section>
        <SectionHeading
          eyebrow={ui.overview.snapshotEyebrow}
          title={ui.overview.snapshotTitle}
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.companyTab(company.slug, "opportunities")}>{ui.overview.viewAll}</Link>
            </Button>
          }
          className="mb-4"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {opportunities.map((opportunity, index) => (
            <OpportunitySnapshotCard
              key={opportunity.id}
              opportunity={opportunity}
              companySlug={company.slug}
              emphasis={index === 0 ? "lead" : opportunityStrengthBand(opportunity.score) === "fraca" ? "muted" : "default"}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <WhyNow items={analysis.whyNow} />
        <BrazilFootprint items={analysis.brazilFootprint} />
      </div>

      <AnalysisHealth health={analysis.health} companySlug={company.slug} />
    </div>
  );
}
