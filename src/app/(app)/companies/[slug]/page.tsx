import { CompanySourceReview } from "@/components/research/company-source-review";
import { AccountBriefing } from "@/components/workspace/account-briefing";
import { EmptyState } from "@/components/shared/empty-state";
import { ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getCompanyBriefing } from "@/server/services/company-briefing-service";
import { getPersistedCompanyWorkspace } from "@/server/services/analysis-service";
import { workspaceStaticParams } from "@/lib/workspace";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export const dynamic = "force-dynamic";

export default async function CompanyOverviewPage({ params }: PageProps<"/companies/[slug]">) {
  const { slug } = await params;
  let companyName = slug;
  let briefing = null;
  let persistenceError = false;
  try {
    const workspace = await getPersistedCompanyWorkspace(slug);
    if (!workspace) notFound();
    companyName = workspace.company.name;
    briefing = await getCompanyBriefing(slug);
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  if (persistenceError) {
    return <EmptyState title={ui.persistence.unavailable} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">{ui.overview.journey}</p>
      {briefing ? <AccountBriefing slug={slug} briefing={briefing} /> : <EmptyState title={ui.errors.missingData} />}
      <CompanySourceReview slug={slug} />
      <p className="sr-only">{companyName}</p>
    </div>
  );
}
