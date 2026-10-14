import Link from "next/link";
import { CompanySearch } from "@/components/home/company-search";
import { RecentAnalysesTable } from "@/components/home/recent-analyses-table";
import { PageContainer } from "@/components/layout/page-header";
import { MetricInline } from "@/components/shared/metric-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { homeMetrics } from "@/data";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { EmptyState } from "@/components/shared/empty-state";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getMergedRecentAnalysisRows } from "@/server/services/analysis-service";
import type { Company, RecentAnalysis } from "@/types";

export default async function HomePage() {
  let rows: { analysis: RecentAnalysis; company: Company }[] = [];
  let persistenceError = false;
  try {
    rows = await getMergedRecentAnalysisRows();
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer className="pt-10 lg:pt-16">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="eyebrow mb-3">{ui.home.welcome}</div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[36px] sm:leading-[1.15]">
          {ui.home.headline}
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">{ui.home.supporting}</p>
        <div className="mt-8 w-full max-w-2xl">
          <CompanySearch />
        </div>
      </section>

      <section className="mt-14 grid grid-cols-3 gap-6 border-y py-5 sm:mx-auto sm:max-w-2xl sm:gap-10">
        {homeMetrics.map((metric) => (
          <MetricInline
            key={metric.key}
            value={metric.value}
            label={ui.home.metrics[metric.key]}
            className="items-center text-center"
          />
        ))}
      </section>

      <section className="mt-12">
        <SectionHeading
          title={ui.home.recentTitle}
          description={ui.home.recentDescription}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href={routes.companies}>{ui.home.viewAll}</Link>
            </Button>
          }
          className="mb-4"
        />
        {persistenceError ? (
          <EmptyState title={ui.persistence.unavailable} />
        ) : (
          <RecentAnalysesTable rows={rows} />
        )}
      </section>
    </PageContainer>
  );
}
