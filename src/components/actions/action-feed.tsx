import { ActionCard } from "@/components/actions/action-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { actionPriorityLabel, actionTypeLabel, relationshipStrengthLabel } from "@/lib/action-display";
import { ACTION_TYPES, ACTION_PRIORITIES } from "@/server/recommended-actions/taxonomy";
import { RELATIONSHIP_STRENGTHS } from "@/server/relationship/taxonomy";
import type { RecommendedActionListItem } from "@/server/recommended-actions/types";

const copy = ui.actions;

export function ActionFeed({
  items,
  companies,
  filters,
}: {
  items: RecommendedActionListItem[];
  companies: { id: string; displayName: string }[];
  filters: {
    companyId: string;
    actionType: string;
    priority: string;
    confidence: string;
    relationshipStrength: string;
  };
}) {
  return (
    <div className="flex flex-col gap-8">
      <details className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">{ui.common.filters}</summary>
        <form method="get" action={routes.actions} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={ui.opportunities.company}>
          <select name="company" defaultValue={filters.companyId} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{ui.opportunities.all}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.type}>
          <select name="type" defaultValue={filters.actionType} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{ui.opportunities.all}</option>
            {ACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {actionTypeLabel(type)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.priority}>
          <select name="priority" defaultValue={filters.priority} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{ui.opportunities.all}</option>
            {ACTION_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {actionPriorityLabel(value)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.confidence}>
          <Input name="confidence" defaultValue={filters.confidence} />
        </Field>
        <Field label={copy.relationshipContext}>
          <select name="strength" defaultValue={filters.relationshipStrength} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{ui.opportunities.all}</option>
            {RELATIONSHIP_STRENGTHS.map((value) => (
              <option key={value} value={value}>
                {relationshipStrengthLabel(value)}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <Button type="submit">{copy.search}</Button>
        </div>
        </form>
      </details>
      {items.length === 0 ? (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <ActionCard key={item.id} item={item} href={`${routes.companyTab(item.companySlug, "actions")}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
