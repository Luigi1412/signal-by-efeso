import Link from "next/link";
import { SectionHeading } from "@/components/shared/section-heading";
import { CompanyAccountCard } from "@/components/companies/company-account-card";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { actionPriorityLabel } from "@/lib/action-display";
import { routes } from "@/lib/routes";
import type { ExecutiveDashboard, ExecutiveLinkItem } from "@/server/services/executive-dashboard-service";

const copy = ui.home;

export function ExecutiveDashboardView({ dashboard }: { dashboard: ExecutiveDashboard }) {
  return (
    <div className="flex flex-col gap-10">
      <section id="o-que-mudou">
        <SectionHeading title={copy.highImportanceSignals} className="mb-4" />
        {dashboard.highImportanceSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.emptySignals}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {dashboard.highImportanceSignals.slice(0, 5).map((item) => (
              <CompactLink key={item.id} item={item} />
            ))}
          </ul>
        )}
        {(dashboard.accountsMoving.length > 0 || dashboard.radarThemes.length > 0) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {dashboard.accountsMoving.length > 0 ? (
              <div>
                <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {copy.accountsMoving}
                </h3>
                <ul className="divide-y rounded-lg border bg-card">
                  {dashboard.accountsMoving.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/40">
                        <span className="text-sm font-medium">{item.companyName}</span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{item.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {dashboard.radarThemes.length > 0 ? (
              <div>
                <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {ui.radar.themes}
                </h3>
                <ul className="divide-y rounded-lg border bg-card">
                  {dashboard.radarThemes.slice(0, 4).map((theme) => (
                    <li key={theme.category} className="px-4 py-3 text-sm">
                      <span className="font-medium">{ui.signals.movement[theme.category]}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {theme.count === 1 ? ui.radar.themeCountOne : `${theme.count} movimentos`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        {dashboard.highRelevanceOpportunities.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.highRelevanceOpportunities}
            </h3>
            <ul className="divide-y rounded-lg border bg-card">
              {dashboard.highRelevanceOpportunities.slice(0, 3).map((item) => (
                <CompactLink key={item.id} item={item} />
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section id="empresas-atencao">
        <SectionHeading
          title={copy.accountsAttention}
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.companies}>{copy.viewAll}</Link>
            </Button>
          }
          className="mb-4"
        />
        {dashboard.attentionAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.emptyAttention}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.attentionAccounts.map((account) => (
              <CompanyAccountCard key={account.companyId} account={account} />
            ))}
          </div>
        )}
      </section>

      <section id="proximos-passos">
        <SectionHeading title={copy.priorityActions} className="mb-4" />
        {dashboard.priorityActions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.emptyActions}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {dashboard.priorityActions.slice(0, 5).map((item) => (
              <CompactLink
                key={item.id}
                item={item}
                meta={item.meta ? `${ui.actions.priority}: ${actionPriorityLabel(item.meta)}` : null}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CompactLink({ item, meta }: { item: ExecutiveLinkItem; meta?: string | null }) {
  return (
    <li>
      <Link href={item.href} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/40">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.companyName}</span>
        <span className="text-sm font-medium text-foreground">{item.title}</span>
        <span className="line-clamp-1 text-xs text-muted-foreground">
          {meta ?? (item.meta && /^\d{4}-/.test(item.meta) ? formatDate(item.meta) : item.summary)}
        </span>
      </Link>
    </li>
  );
}
