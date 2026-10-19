import { CompanySearch } from "@/components/home/company-search";
import { ExecutiveDashboardView } from "@/components/home/executive-dashboard";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { t, ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getExecutiveDashboard } from "@/server/services/executive-dashboard-service";
import { getSidebarUser } from "@/server/services/analysis-service";

export default async function HomePage() {
  const user = await getSidebarUser();
  const firstName = user.name.trim().split(/\s+/)[0] || "EFESO";
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
      <PageHeader
        eyebrow={t(ui.home.welcome, { name: firstName })}
        title={ui.home.headline}
        description={ui.home.supporting}
        className="mb-6"
      />
      <div className="mb-10 max-w-3xl">
        <CompanySearch />
      </div>
      {persistenceError || !dashboard ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <ExecutiveDashboardView dashboard={dashboard} />
      )}
    </PageContainer>
  );
}
