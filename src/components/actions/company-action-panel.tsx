import { KeyValue } from "@/components/shared/key-value";
import { RelationshipIntelligencePanel } from "@/components/relationship/relationship-intelligence-panel";
import { ui } from "@/i18n";
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
        <article key={action.id} className="rounded-lg border bg-card p-6">
          <h3 className="text-xl font-semibold">{action.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">Ação sugerida</p>
          <p className="mt-1 text-sm leading-relaxed">{action.rationale}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <KeyValue label="Motivo">
              {block(action, "opportunity_context") ?? block(action, "efeso_context") ?? action.rationale}
            </KeyValue>
            <KeyValue label={copy.linkedOpportunity}>{action.opportunityTitle ?? "—"}</KeyValue>
            <KeyValue label="Relacionamento disponível">
              {block(action, "relationship_context") ??
                (relationship && !relationship.unavailable ? relationship.relationshipSummary : "—")}
            </KeyValue>
            <KeyValue label={copy.owner}>
              {action.ownerName ?? copy.ownerUnknown}
            </KeyValue>
            <KeyValue label={copy.uncertainty}>
              {block(action, "uncertainty") ?? action.uncertaintyStatement ?? "—"}
            </KeyValue>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            O Signal sugere o próximo passo. Nada é executado automaticamente.
          </p>
        </article>
      ))}
    </div>
  );
}
