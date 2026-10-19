import { KeyValue } from "@/components/shared/key-value";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { RelationshipIntelligencePanel } from "@/components/relationship/relationship-intelligence-panel";
import { ui } from "@/i18n";
import { actionPriorityLabel, actionTypeLabel, priorityTone } from "@/lib/action-display";
import type { RecommendedActionDetail } from "@/server/recommended-actions/types";
import type { AccountRelationshipView } from "@/server/relationship/types";

const copy = ui.actions;

function block(detail: RecommendedActionDetail, type: string): string | null {
  return detail.rationaleBlocks.find((row) => row.rationaleType === type)?.statement ?? null;
}

export function CompanyActionPanel({
  actions,
  relationship,
}: {
  actions: RecommendedActionDetail[];
  relationship: AccountRelationshipView | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      {relationship ? <RelationshipIntelligencePanel view={relationship} /> : null}
      {actions.map((action) => (
        <article key={action.id} className="rounded-lg border bg-card">
          <header className="flex flex-col gap-3 p-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={priorityTone(action.priority)} dot={false} size="sm">
                {copy.priority}: {actionPriorityLabel(action.priority)}
              </StatusBadge>
              <Badge variant="outline">{actionTypeLabel(action.actionType)}</Badge>
              {action.demoOrigin ? (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {copy.demoOrigin}
                </Badge>
              ) : null}
            </div>
            <h3 className="text-xl font-semibold">{action.title}</h3>
            <p className="text-sm text-muted-foreground">{action.rationale}</p>
            <dl className="grid gap-4 sm:grid-cols-3">
              <KeyValue label={copy.linkedOpportunity}>{action.opportunityTitle ?? "—"}</KeyValue>
              <KeyValue label={copy.owner}>{action.ownerName ?? copy.ownerUnknown}</KeyValue>
              <KeyValue label={copy.confidence}>{action.confidenceTier}</KeyValue>
            </dl>
          </header>
          <div className="grid gap-6 border-t p-6 lg:grid-cols-2">
            <section>
              <h4 className="text-sm font-semibold">{copy.why}</h4>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li>{block(action, "opportunity_context")}</li>
                <li>{block(action, "relationship_context")}</li>
                <li>{block(action, "efeso_context")}</li>
              </ul>
            </section>
            <section>
              <h4 className="text-sm font-semibold">{copy.uncertainty}</h4>
              <p className="mt-2 rounded-md border border-hypothesis-border bg-hypothesis-muted/60 px-3 py-2 text-sm">
                {block(action, "uncertainty") ?? action.uncertaintyStatement}
              </p>
            </section>
          </div>
          <footer className="border-t px-6 py-4 text-xs text-muted-foreground">{ui.overview.viewEvidence}</footer>
        </article>
      ))}
    </div>
  );
}
