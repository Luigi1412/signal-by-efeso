import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { CompanyFitHeatmap } from "@/components/intelligence/company-fit-heatmap";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import {
  getCompanyEfesoFit,
  getCompanyFitHeatmap,
  getGlobalAccountIntelligenceWithThemes,
} from "@/server/services/account-query-service";
import { getTopOpportunityByCompany } from "@/server/services/opportunity-query-service";
import { listAccountActionPositions } from "@/server/services/relationship-query-service";
import { RelationshipMatrix } from "@/components/relationship/relationship-matrix";
import type { CompanyFitHeatmapCell, EfesoFitView, GlobalAccountIntelligenceRow } from "@/server/intelligence/types";
import type { OpportunityListItem } from "@/server/opportunities/types";
import type { AccountActionPosition } from "@/server/relationship/types";
import { formatDate } from "@/lib/labels";
import { opportunityLevelLabel, opportunityMaturityLabel } from "@/lib/opportunity-display";

export const metadata: Metadata = { title: ui.accountsIntelligence.title };
export const dynamic = "force-dynamic";

export default async function GlobalAccountIntelligencePage() {
  await requireEfesoAccess();

  let rows: GlobalAccountIntelligenceRow[] = [];
  let heatmap: {
    companies: { id: string; name: string; slug: string }[];
    offerings: { id: string; name: string; objectType: string }[];
    cells: CompanyFitHeatmapCell[];
  } = { companies: [], offerings: [], cells: [] };
  const explanations: EfesoFitView[] = [];
  let opportunityPreviews: {
    companyId: string;
    companyName: string;
    companySlug: string;
    topOpportunity: OpportunityListItem | null;
  }[] = [];
  let positions: AccountActionPosition[] = [];
  try {
    rows = await getGlobalAccountIntelligenceWithThemes();
    heatmap = await getCompanyFitHeatmap();
    opportunityPreviews = await getTopOpportunityByCompany();
    positions = await listAccountActionPositions();
    for (const company of heatmap.companies) {
      const fits = await getCompanyEfesoFit(company.id);
      explanations.push(...fits);
    }
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.accountsIntelligence.eyebrow}
        title={ui.accountsIntelligence.headline}
        description={ui.accountsIntelligence.description}
        className="mb-8"
      />
      {rows.length === 0 ? (
        <EmptyState title={ui.accountsIntelligence.empty} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.company}</th>
                <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.themes}</th>
                <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.latestSignal}</th>
                <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.topFit}</th>
                <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.status}</th>
                <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.updated}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.companyId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link className="font-medium underline-offset-4 hover:underline" href={routes.companyTab(row.companySlug, "intelligence")}>
                      {row.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.topThemes.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.latestMajorSignal?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.topFit ? (
                      <span>
                        {row.topFit.knowledgeName}{" "}
                        <Badge variant="outline">{opportunityLevelLabel(String(row.topFit.fitLevel))}</Badge>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{row.intelligenceStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.generatedAt ? formatDate(row.generatedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10">
        <SectionHeading title={ui.accountsIntelligence.potentialOpportunities} />
        {opportunityPreviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{ui.accountsIntelligence.noOpportunity}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.company}</th>
                  <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.topOpportunity}</th>
                  <th className="px-4 py-3 font-medium">{ui.opportunities.relevance}</th>
                  <th className="px-4 py-3 font-medium">{ui.opportunities.urgency}</th>
                  <th className="px-4 py-3 font-medium">{ui.opportunities.maturity}</th>
                  <th className="px-4 py-3 font-medium">{ui.opportunities.primaryCapability}</th>
                </tr>
              </thead>
              <tbody>
                {opportunityPreviews.map((row) => (
                  <tr key={row.companyId} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link className="font-medium underline-offset-4 hover:underline" href={routes.companyTab(row.companySlug, "opportunities")}>
                        {row.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.topOpportunity?.title ?? "—"}</td>
                    <td className="px-4 py-3">{row.topOpportunity ? opportunityLevelLabel(row.topOpportunity.relevanceLevel) : "—"}</td>
                    <td className="px-4 py-3">{row.topOpportunity ? opportunityLevelLabel(row.topOpportunity.urgencyLevel) : "—"}</td>
                    <td className="px-4 py-3">{row.topOpportunity ? opportunityMaturityLabel(row.topOpportunity.maturity) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.topOpportunity?.primaryCapability ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10">
        <SectionHeading title={ui.accountsIntelligence.matrixTitle} description={ui.accountsIntelligence.matrixDescription} />
        <div className="mt-4">
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ui.relationship.unavailable}</p>
          ) : (
            <RelationshipMatrix positions={positions} />
          )}
        </div>
      </div>

      <div className="mt-10">
        <SectionHeading title={ui.heatmap.title} description={ui.heatmap.description} />
        <div className="mt-4">
          <CompanyFitHeatmap
            companies={heatmap.companies}
            offerings={heatmap.offerings}
            cells={heatmap.cells}
            explanations={explanations}
          />
        </div>
      </div>
    </PageContainer>
  );
}
