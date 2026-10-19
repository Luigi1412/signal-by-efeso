import { EmptyState } from "@/components/shared/empty-state";
import { KeyValue } from "@/components/shared/key-value";
import { StatusBadge } from "@/components/shared/status-badge";
import { ui } from "@/i18n";
import {
  levelTone,
  opportunityLevelLabel,
} from "@/lib/opportunity-display";
import type { OpportunityDetail } from "@/server/opportunities/types";

const copy = ui.opportunities;

interface CompanyOpportunityPanelProps {
  opportunities: OpportunityDetail[];
  companySlug: string;
}

function block(detail: OpportunityDetail, type: string): string | null {
  return detail.rationaleBlocks.find((row) => row.rationaleType === type)?.statement ?? null;
}

export function CompanyOpportunityPanel({ opportunities }: CompanyOpportunityPanelProps) {
  if (opportunities.length === 0) {
    return <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {opportunities.map((opportunity) => {
        const evidence = block(opportunity, "signal_trigger") ?? opportunity.summary;
        const fit = block(opportunity, "efeso_relevance") ?? opportunity.primaryCapability;
        const uncertainty = block(opportunity, "uncertainty");
        return (
          <article key={opportunity.id} id={opportunity.id} className="rounded-lg border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={levelTone(opportunity.relevanceLevel)} dot={false} size="sm">
                {copy.status}: {opportunity.status === "active" ? "Ativa" : opportunity.status}
              </StatusBadge>
              <StatusBadge tone={levelTone(opportunity.relevanceLevel)} dot={false} size="sm">
                {copy.efesoFit}: {opportunityLevelLabel(opportunity.relevanceLevel)}
              </StatusBadge>
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{opportunity.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Hipótese</p>
            <p className="mt-1 text-sm leading-relaxed">{opportunity.summary}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <KeyValue label="Evidência principal">{evidence ?? "—"}</KeyValue>
              <KeyValue label={copy.efesoFit}>{fit ?? "—"}</KeyValue>
              <KeyValue label={copy.uncertainty}>{uncertainty ?? "—"}</KeyValue>
              <KeyValue label={copy.status}>{opportunity.status === "active" ? "Ativa" : opportunity.status}</KeyValue>
            </dl>
          </article>
        );
      })}
    </div>
  );
}
