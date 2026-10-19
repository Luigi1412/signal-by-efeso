import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { CompanyAccountCard } from "@/components/companies/company-account-card";
import { EmptyState } from "@/components/shared/empty-state";
import { t, ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getExecutiveDashboard } from "@/server/services/executive-dashboard-service";

export const metadata: Metadata = { title: ui.companies.title };

export default async function CompaniesPage() {
  let persistenceError = false;
  let dashboard = null;
  try {
    dashboard = await getExecutiveDashboard();
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer>
      <PageHeader title={ui.companies.title} description={ui.companies.description} className="mb-8" />
      {persistenceError || !dashboard ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : dashboard.accounts.length === 0 ? (
        <EmptyState title={ui.companies.empty} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.accounts.map((account) => (
              <CompanyAccountCard key={account.companyId} account={account} />
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t(ui.companies.showing, { shown: dashboard.accounts.length })}</p>
        </>
      )}
    </PageContainer>
  );
}
