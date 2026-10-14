import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RecentAnalysesTable } from "@/components/home/recent-analyses-table";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { t, ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { EmptyState } from "@/components/shared/empty-state";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getMergedRecentAnalysisRows } from "@/server/services/analysis-service";
import type { Company, RecentAnalysis } from "@/types";

export const metadata: Metadata = { title: ui.companies.title };

export default async function CompaniesPage() {
  let rows: { analysis: RecentAnalysis; company: Company }[] = [];
  let persistenceError = false;
  try {
    rows = await getMergedRecentAnalysisRows();
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer>
      <PageHeader
        title={ui.companies.title}
        description={ui.companies.description}
        actions={
          <Button asChild variant="brand">
            <Link href={routes.newAnalysis}>
              <Plus data-icon="inline-start" />
              {ui.nav.newAnalysis}
            </Link>
          </Button>
        }
        className="mb-6"
      />
      {persistenceError ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <>
          <RecentAnalysesTable rows={rows} />
          <p className="mt-3 text-xs text-muted-foreground">
            {t(ui.companies.showing, { shown: rows.length, total: 12 })}
          </p>
        </>
      )}
    </PageContainer>
  );
}
