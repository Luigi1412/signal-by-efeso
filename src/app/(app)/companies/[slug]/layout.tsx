import { notFound } from "next/navigation";
import { CompanyWorkspaceHeader } from "@/components/workspace/company-workspace-header";
import { ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getPersistedCompanyWorkspace } from "@/server/services/analysis-service";
import { getCompanyBriefing } from "@/server/services/company-briefing-service";
import { memberResearchStatusLabel } from "@/server/product/research-outcome";
import { listResearchRunsForCompany, listWorkspaceCompanies } from "@/server/external-research/persistence";
import { assertEfesoAccess } from "@/server/access/require-efeso-access";
import { workspaceStaticParams } from "@/lib/workspace";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export async function generateMetadata({ params }: LayoutProps<"/companies/[slug]">) {
  const { slug } = await params;
  try {
    const workspace = await getPersistedCompanyWorkspace(slug);
    return { title: workspace?.company.name ?? ui.companies.columns.company };
  } catch {
    return { title: ui.companies.columns.company };
  }
}

export default async function CompanyWorkspaceLayout({ children, params }: LayoutProps<"/companies/[slug]">) {
  const { slug } = await params;
  let workspace = null;
  let outcomeLabel: string | null = null;
  let statusLabel: string | null = null;
  try {
    workspace = await getPersistedCompanyWorkspace(slug);
    const briefing = await getCompanyBriefing(slug);
    if (briefing) outcomeLabel = briefing.outcomeTitle;
    try {
      const access = await assertEfesoAccess();
      const companies = await listWorkspaceCompanies(access.workspaceId);
      const company = companies.find((item) => item.slug === slug);
      if (company) {
        const runs = await listResearchRunsForCompany(access.workspaceId, company.id);
        statusLabel = memberResearchStatusLabel(runs[0]?.status ?? null, briefing?.outcome ?? null);
      }
    } catch {
      statusLabel = null;
    }
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
  }
  if (!workspace) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <CompanyWorkspaceHeader
        company={workspace.company}
        analysis={workspace.analysis}
        lastResearchedAtLabel={workspace.lastResearchedAtLabel}
        outcomeLabel={outcomeLabel}
        statusLabel={statusLabel}
      />
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 lg:px-10 print:max-w-none print:px-0 print:py-0">
        {children}
      </div>
    </div>
  );
}
