import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { CompaniesHistory } from "@/components/companies/companies-history";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { listCompanyHistory } from "@/server/services/companies-history-service";

export const metadata: Metadata = { title: ui.companies.title };
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  let persistenceError = false;
  let rows: Awaited<ReturnType<typeof listCompanyHistory>> = [];
  try {
    rows = await listCompanyHistory();
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer>
      <PageHeader
        title={ui.companies.title}
        description={ui.companies.description}
        className="mb-8"
        actions={
          <Button asChild variant="brand">
            <Link href={routes.researchNew}>{ui.companies.newResearch}</Link>
          </Button>
        }
      />
      {persistenceError ? <EmptyState title={ui.persistence.unavailable} /> : <CompaniesHistory rows={rows} />}
    </PageContainer>
  );
}
