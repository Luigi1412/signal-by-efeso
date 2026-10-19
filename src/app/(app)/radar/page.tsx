import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { t, ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getExecutiveDashboard } from "@/server/services/executive-dashboard-service";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import type { ExecutiveLinkItem } from "@/server/services/executive-dashboard-service";

export const metadata: Metadata = { title: ui.radar.title };
export const dynamic = "force-dynamic";

export default async function RadarPage() {
  await requireEfesoAccess();
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
      <PageHeader title={ui.radar.title} description={ui.radar.description} className="mb-8" />
      {persistenceError || !dashboard ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <div className="flex flex-col gap-10">
          <section>
            <SectionHeading title={ui.radar.movements} className="mb-4" />
            {dashboard.highImportanceSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{ui.home.emptySignals}</p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {dashboard.highImportanceSignals.map((item) => (
                  <RadarLink key={item.id} item={item} showDate />
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeading title={ui.radar.companiesMoving} className="mb-4" />
            {dashboard.accountsMoving.length === 0 ? (
              <p className="text-sm text-muted-foreground">{ui.home.emptyMoving}</p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {dashboard.accountsMoving.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/40">
                      <span className="text-sm font-medium">{item.companyName}</span>
                      <span className="line-clamp-1 text-sm text-muted-foreground">{item.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeading title={ui.radar.themes} className="mb-4" />
            {dashboard.radarThemes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{ui.radar.emptyThemes}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {dashboard.radarThemes.map((theme) => (
                  <article key={theme.category} className="rounded-lg border bg-card px-4 py-3">
                    <h3 className="text-sm font-medium">{ui.signals.movement[theme.category]}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {theme.count === 1 ? ui.radar.themeCountOne : t(ui.radar.themeCount, { count: theme.count })}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading title={ui.radar.emerging} className="mb-4" />
            {dashboard.highRelevanceOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{ui.home.emptyOpportunities}</p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {dashboard.highRelevanceOpportunities.map((item) => (
                  <RadarLink key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageContainer>
  );
}

function RadarLink({ item, showDate = false }: { item: ExecutiveLinkItem; showDate?: boolean }) {
  return (
    <li>
      <Link href={item.href} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/40">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.companyName}</span>
        <span className="text-sm font-medium">{item.title}</span>
        {showDate && item.meta ? (
          <span className="text-xs text-muted-foreground">{formatDate(item.meta)}</span>
        ) : (
          <span className="line-clamp-1 text-xs text-muted-foreground">{item.summary}</span>
        )}
      </Link>
    </li>
  );
}
