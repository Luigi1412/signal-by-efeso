import { KeyValue } from "@/components/shared/key-value";
import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { contactRoleLabel, dataQualityLabel, relationshipSourceLabel, relationshipStatusLabel, relationshipStrengthLabel } from "@/lib/action-display";
import type { AccountRelationshipView } from "@/server/relationship/types";

const copy = ui.relationship;

export function RelationshipIntelligencePanel({ view }: { view: AccountRelationshipView }) {
  if (view.unavailable) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.unavailable}</p>
        <p className="mt-2 text-xs text-muted-foreground">{copy.description}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KeyValue label={copy.status}>{relationshipStatusLabel(view.relationshipStatus)}</KeyValue>
        <KeyValue label={copy.strength}>{relationshipStrengthLabel(view.derivedStrength)}</KeyValue>
        <KeyValue label={copy.quality}>{dataQualityLabel(view.dataQuality)}</KeyValue>
        <KeyValue label={copy.lastInteraction}>{view.lastKnownInteractionAt?.slice(0, 10) ?? "—"}</KeyValue>
        <KeyValue label={copy.owner}>{view.accountOwner?.person.displayName ?? ui.actions.ownerUnknown}</KeyValue>
        <KeyValue label={copy.source}>
          {relationshipSourceLabel(view.sourceType)}
        </KeyValue>
      </dl>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">{copy.holders}</h3>
          {view.efesoHolders.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{copy.none}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {view.efesoHolders.map((item) => (
                <li key={item.id}>
                  {item.person.displayName} · {contactRoleLabel(item.relationshipRole)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">{copy.clientContacts}</h3>
          {view.clientContacts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{copy.none}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {view.clientContacts.map((item) => (
                <li key={item.id}>
                  {item.person.displayName} · {contactRoleLabel(item.relationshipRole)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {view.demoOrigin ? (
        <Badge variant="outline" className="mt-4 font-normal text-muted-foreground">
          {ui.actions.demoOrigin}
        </Badge>
      ) : null}
    </section>
  );
}
