import { CompanyReport } from "@/components/workspace/company-report";
import { EmptyState } from "@/components/shared/empty-state";
import { ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getCompanyBriefing } from "@/server/services/company-briefing-service";
import { getPersistedCompanyWorkspace } from "@/server/services/analysis-service";
import { assertEfesoAccess } from "@/server/access/require-efeso-access";
import { listResearchRunsForCompany, listSourceCandidates, listWorkspaceCompanies } from "@/server/external-research/persistence";
import { workspaceStaticParams } from "@/lib/workspace";
import { isExplicitDemoContent } from "@/lib/supabase/env";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export const dynamic = "force-dynamic";

export default async function CompanyOverviewPage({ params }: PageProps<"/companies/[slug]">) {
  const { slug } = await params;
  let briefing = null;
  let persistenceError = false;
  let sources: Awaited<ReturnType<typeof listSourceCandidates>> = [];
  let history: Awaited<ReturnType<typeof listResearchRunsForCompany>> = [];

  try {
    const workspace = await getPersistedCompanyWorkspace(slug);
    if (!workspace) notFound();
    briefing = await getCompanyBriefing(slug);
    const access = await assertEfesoAccess();
    const companies = await listWorkspaceCompanies(access.workspaceId);
    const company = companies.find((item) => item.slug === slug);
    if (company) {
      history = await listResearchRunsForCompany(access.workspaceId, company.id);
      if (history[0]) sources = await listSourceCandidates(history[0].id);
    }
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  if (persistenceError) {
    return <EmptyState title={ui.persistence.unavailable} />;
  }

  if (!briefing) {
    return <EmptyState title={ui.errors.missingData} />;
  }

  return (
    <CompanyReport
      slug={slug}
      briefing={briefing}
      sources={sources}
      history={history}
      demoMode={isExplicitDemoContent()}
    />
  );
}
