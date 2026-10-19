import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { KeyValue } from "@/components/shared/key-value";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { knowledgeTypeLabel } from "@/lib/knowledge-display";
import { routes } from "@/lib/routes";
import {
  levelTone,
  opportunityConfidenceLabel,
  opportunityLevelLabel,
  opportunityMaturityLabel,
  opportunityTypeLabel,
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

export function CompanyOpportunityPanel({ opportunities, companySlug }: CompanyOpportunityPanelProps) {
  if (opportunities.length === 0) {
    return <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {opportunities.map((opportunity) => (
        <article key={opportunity.id} id={opportunity.id} className="rounded-lg border bg-card">
          <header className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={levelTone(opportunity.relevanceLevel)} dot={false} size="sm">
                {copy.relevance}: {opportunityLevelLabel(opportunity.relevanceLevel)}
              </StatusBadge>
              <Badge variant="outline">
                {copy.urgency}: {opportunityLevelLabel(opportunity.urgencyLevel)}
              </Badge>
              <Badge variant="outline">{opportunityMaturityLabel(opportunity.maturity)}</Badge>
              <Badge variant="outline">{opportunityTypeLabel(String(opportunity.opportunityType))}</Badge>
              {opportunity.demoOrigin ? (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {copy.demoOrigin}
                </Badge>
              ) : null}
            </div>
            <h3 className="text-xl font-semibold tracking-tight">{opportunity.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{opportunity.summary}</p>
            <dl className="grid gap-4 sm:grid-cols-3">
              <KeyValue label={copy.primaryCapability}>{opportunity.primaryCapability ?? "—"}</KeyValue>
              <KeyValue label={copy.confidence}>{opportunityConfidenceLabel(opportunity.confidenceTier)}</KeyValue>
              <KeyValue label={copy.triggerSignal}>{opportunity.triggerSignalTitle ?? "—"}</KeyValue>
            </dl>
          </header>
          <div className="grid gap-6 border-t p-6 lg:grid-cols-2">
            <Block title={copy.whyExists} body={block(opportunity, "signal_trigger")} />
            <Block title={copy.accountContext} body={block(opportunity, "account_context")} />
            <Block title={copy.whyEfeso} body={block(opportunity, "efeso_relevance")} />
            <Block title={copy.uncertainty} body={block(opportunity, "uncertainty")} highlight />
          </div>
          <div className="grid gap-6 border-t p-6 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">{copy.supportingSignals}</h4>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {opportunity.signals.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${routes.companyTab(companySlug, "signals")}?signal=${item.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">{copy.relevantKnowledge}</h4>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {opportunity.knowledge.map((item) => (
                  <li key={`${item.id}-${item.relationshipType}`}>
                    {item.name} · {knowledgeTypeLabel(item.objectType)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <footer className="border-t px-6 py-4 text-xs text-muted-foreground">{ui.overview.viewEvidence}</footer>
        </article>
      ))}
    </div>
  );
}

function Block({ title, body, highlight = false }: { title: string; body: string | null; highlight?: boolean }) {
  return (
    <section>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className={highlight ? "mt-2 rounded-md border border-hypothesis-border bg-hypothesis-muted/60 px-3 py-2 text-sm" : "mt-2 text-sm leading-relaxed text-muted-foreground"}>
        {body ?? "—"}
      </p>
    </section>
  );
}
