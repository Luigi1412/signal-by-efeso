"use client";

import { OpportunityDetailDrawer } from "@/components/opportunities/opportunity-detail-drawer";
import { OpportunityIntelligenceCard } from "@/components/opportunities/opportunity-intelligence-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { opportunityConfidenceLabel, opportunityLevelLabel, opportunityMaturityLabel, opportunityTypeLabel } from "@/lib/opportunity-display";
import { OPPORTUNITY_TYPES, OPPORTUNITY_MATURITIES, OPPORTUNITY_LEVELS, OPPORTUNITY_CONFIDENCE_TIERS } from "@/server/opportunities/taxonomy";
import type { OpportunityDetail, OpportunityListItem } from "@/server/opportunities/types";

const copy = ui.opportunities;

interface OpportunityFeedProps {
  items: OpportunityListItem[];
  selected: OpportunityDetail | null;
  companies: { id: string; displayName: string }[];
  filters: {
    query: string;
    companyId: string;
    opportunityType: string;
    relevanceLevel: string;
    urgencyLevel: string;
    maturity: string;
    confidenceTier: string;
    geography: string;
  };
}

export function OpportunityFeed({ items, selected, companies, filters }: OpportunityFeedProps) {
  return (
    <div className="flex flex-col gap-8">
      <details className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">{ui.common.filters}</summary>
        <form method="get" action={routes.opportunities} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={copy.query}>
          <Input name="q" defaultValue={filters.query} />
        </Field>
        <Field label={copy.company}>
          <select name="company" defaultValue={filters.companyId} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{copy.all}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.type}>
          <select name="type" defaultValue={filters.opportunityType} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{copy.all}</option>
            {OPPORTUNITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {opportunityTypeLabel(type)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.relevance}>
          <select name="relevance" defaultValue={filters.relevanceLevel} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{copy.all}</option>
            {OPPORTUNITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {opportunityLevelLabel(level)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.urgency}>
          <select name="urgency" defaultValue={filters.urgencyLevel} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{copy.all}</option>
            {OPPORTUNITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {opportunityLevelLabel(level)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.maturity}>
          <select name="maturity" defaultValue={filters.maturity} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{copy.all}</option>
            {OPPORTUNITY_MATURITIES.map((value) => (
              <option key={value} value={value}>
                {opportunityMaturityLabel(value)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.confidence}>
          <select name="confidence" defaultValue={filters.confidenceTier} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">{copy.all}</option>
            {OPPORTUNITY_CONFIDENCE_TIERS.map((value) => (
              <option key={value} value={value}>
                {opportunityConfidenceLabel(value)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.geography}>
          <Input name="geography" defaultValue={filters.geography} />
        </Field>
        <div className="flex items-end">
          <Button type="submit">{copy.search}</Button>
        </div>
        </form>
      </details>
      {items.length === 0 ? (
        <EmptyState title={copy.emptyFilteredTitle} description={copy.emptyFilteredDescription} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <OpportunityIntelligenceCard
              key={item.id}
              item={item}
              href={`${routes.opportunities}?opportunity=${item.id}`}
            />
          ))}
        </div>
      )}
      <OpportunityDetailDrawer
        detail={selected}
        open={Boolean(selected)}
        onOpenChange={() => undefined}
        closeHref={routes.opportunities}
      />
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
