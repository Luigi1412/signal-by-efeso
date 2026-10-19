"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { SignalDetailDrawer } from "@/components/signals/signal-detail-drawer";
import { SignalRadarCard } from "@/components/signals/signal-radar-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  daysAgoIso,
  groupSignalsByMovement,
  hasActiveSignalFilters,
  pickFeaturedSignals,
  summarizeSignals,
} from "@/lib/signal-display";
import { SIGNAL_IMPORTANCE_LEVELS, SIGNAL_TYPES } from "@/server/signals/taxonomy";
import type { SignalDetail, SignalListItem } from "@/server/signals/types";
import { cn } from "@/lib/utils";
import { Info, Radio } from "lucide-react";

const copy = ui.signals;
const ASSERTION_MODES = Object.keys(ui.assertionMode);

export interface SignalFeedFilters {
  query: string;
  companyId: string;
  signalType: string;
  importance: string;
  geography: string;
  assertionMode: string;
  dateFrom: string;
  dateTo: string;
}

interface SignalFeedProps {
  items: SignalListItem[];
  selected: SignalDetail | null;
  companies: { id: string; displayName: string }[];
  filters: SignalFeedFilters;
  formAction?: string;
  hideCompanyFilter?: boolean;
  layout?: "radar" | "company";
  asOfDate: string;
}

export function SignalFeed({
  items,
  selected,
  companies,
  filters,
  formAction = routes.signals,
  hideCompanyFilter = false,
  layout = "company",
  asOfDate,
}: SignalFeedProps) {
  const [open, setOpen] = useState(Boolean(selected));
  const filtered = hasActiveSignalFilters(filters);
  const summary = summarizeSignals(items);
  const featured = layout === "radar" ? pickFeaturedSignals(items) : [];
  const grouped = groupSignalsByMovement(items);
  const closeHref = queryHref(formAction, filters, hideCompanyFilter);
  const recentFrom = daysAgoIso(asOfDate, 30);
  const frequentLabel = summary.frequentMovements.map((category) => copy.movement[category]).join(" / ") || copy.none;

  return (
    <div className="flex flex-col gap-10">
      {layout === "radar" ? (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <p className="max-w-2xl text-sm text-muted-foreground">{copy.globalSupport}</p>
            <button
              type="button"
              className="mt-0.5 text-muted-foreground hover:text-foreground"
              aria-label={copy.globalHelp}
              title={copy.globalHelp}
            >
              <Info className="size-3.5" />
            </button>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label={copy.activeCount} value={String(summary.activeCount)} />
            <SummaryCard label={copy.highImportanceCount} value={String(summary.highImportanceCount)} />
            <SummaryCard label={copy.companiesMoving} value={String(summary.companiesMoving)} />
            <SummaryCard label={copy.frequentMovements} value={frequentLabel} />
          </section>

          <div className="flex flex-wrap gap-2">
            <QuickFilter
              href={toggleHref(formAction, filters, hideCompanyFilter, { importance: "high" })}
              active={filters.importance === "high"}
              label={copy.quickHigh}
            />
            <QuickFilter
              href={toggleHref(formAction, filters, hideCompanyFilter, { dateFrom: recentFrom })}
              active={filters.dateFrom === recentFrom}
              label={copy.quickRecent}
            />
            <QuickFilter
              href={toggleHref(formAction, filters, hideCompanyFilter, { signalType: "capex_investment" })}
              active={filters.signalType === "capex_investment"}
              label={copy.quickCapex}
            />
            <QuickFilter
              href={toggleHref(formAction, filters, hideCompanyFilter, { signalType: "restructuring" })}
              active={filters.signalType === "restructuring"}
              label={copy.quickRestructuring}
            />
            <QuickFilter
              href={toggleHref(formAction, filters, hideCompanyFilter, { signalType: "sustainability_program" })}
              active={filters.signalType === "sustainability_program"}
              label={copy.quickSustainability}
            />
          </div>
        </>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={copy.emptyFilteredTitle}
          description={copy.emptyFilteredDescription}
          action={
            filtered ? (
              <Button asChild variant="outline">
                <Link href={formAction}>{copy.clearFilters}</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          {layout === "radar" && featured.length > 0 ? (
            <section className="flex flex-col gap-4">
              <SectionHeading title={copy.whatChanged} />
              <ul className="grid gap-4">
                {featured.map((item) => (
                  <li key={`featured-${item.id}`}>
                    <SignalRadarCard
                      item={item}
                      featured
                      href={`${formAction}?${keepFilters(filters, item.id, hideCompanyFilter)}`}
                      onOpen={() => setOpen(true)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="flex flex-col gap-6">
            {layout === "radar" ? <SectionHeading title={copy.allSignals} /> : null}
            {grouped.map((group) => (
              <div key={group.category} className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">{copy.movement[group.category]}</h3>
                <ul className="grid gap-3">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <SignalRadarCard
                        item={item}
                        showCompany={layout === "radar"}
                        href={`${formAction}?${keepFilters(filters, item.id, hideCompanyFilter)}`}
                        onOpen={() => setOpen(true)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      <FilterPanel
        filters={filters}
        companies={companies}
        formAction={formAction}
        hideCompanyFilter={hideCompanyFilter}
        open={filtered}
      />

      <SignalDetailDrawer
        detail={selected}
        open={open && Boolean(selected)}
        onOpenChange={setOpen}
        closeHref={closeHref}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function QuickFilter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function FilterPanel({
  filters,
  companies,
  formAction,
  hideCompanyFilter,
  open,
}: {
  filters: SignalFeedFilters;
  companies: { id: string; displayName: string }[];
  formAction: string;
  hideCompanyFilter: boolean;
  open: boolean;
}) {
  return (
    <details className="rounded-lg border bg-card" {...(open ? { open: true } : {})}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{copy.filterSignals}</summary>
      <form method="get" action={formAction} className="grid gap-4 border-t px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="q">{copy.query}</Label>
          <Input id="q" name="q" defaultValue={filters.query} placeholder={copy.query} />
        </div>
        {hideCompanyFilter ? null : (
          <div className="grid gap-2">
            <Label htmlFor="company">{copy.company}</Label>
            <select
              id="company"
              name="company"
              defaultValue={filters.companyId}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{copy.all}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.displayName}
                </option>
              ))}
            </select>
          </div>
        )}
        <SelectField name="type" label={copy.type} value={filters.signalType} options={[...SIGNAL_TYPES]} labels={ui.signalType} />
        <SelectField
          name="importance"
          label={copy.importance}
          value={filters.importance}
          options={[...SIGNAL_IMPORTANCE_LEVELS]}
          labels={ui.signalImportance}
        />
        <SelectField
          name="assertion"
          label={copy.assertionMode}
          value={filters.assertionMode}
          options={ASSERTION_MODES}
          labels={ui.assertionMode}
        />
        <div className="grid gap-2">
          <Label htmlFor="geography">{copy.geography}</Label>
          <Input id="geography" name="geography" defaultValue={filters.geography} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="from">{copy.dateFrom}</Label>
          <Input id="from" name="from" type="date" defaultValue={filters.dateFrom} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="to">{copy.dateTo}</Label>
          <Input id="to" name="to" type="date" defaultValue={filters.dateTo} />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit">{copy.search}</Button>
          {open ? (
            <Button type="button" variant="ghost" asChild>
              <Link href={formAction}>{copy.clearFilters}</Link>
            </Button>
          ) : null}
        </div>
      </form>
    </details>
  );
}

function keepFilters(filters: SignalFeedFilters, signalId: string, hideCompanyFilter: boolean): string {
  const params = filterParams(filters, hideCompanyFilter);
  if (signalId) params.set("signal", signalId);
  return params.toString();
}

function queryHref(formAction: string, filters: SignalFeedFilters, hideCompanyFilter: boolean): string {
  const query = filterParams(filters, hideCompanyFilter).toString();
  return query ? `${formAction}?${query}` : formAction;
}

function toggleHref(
  formAction: string,
  filters: SignalFeedFilters,
  hideCompanyFilter: boolean,
  patch: Partial<Pick<SignalFeedFilters, "importance" | "dateFrom" | "signalType">>,
): string {
  const next = { ...filters };
  for (const [key, value] of Object.entries(patch) as [keyof typeof patch, string][]) {
    if (!value) continue;
    if (next[key] === value) next[key] = "";
    else next[key] = value;
  }
  return queryHref(formAction, next, hideCompanyFilter);
}

function filterParams(filters: SignalFeedFilters, hideCompanyFilter: boolean): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (!hideCompanyFilter && filters.companyId) params.set("company", filters.companyId);
  if (filters.signalType) params.set("type", filters.signalType);
  if (filters.importance) params.set("importance", filters.importance);
  if (filters.geography) params.set("geography", filters.geography);
  if (filters.assertionMode) params.set("assertion", filters.assertionMode);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  return params;
}

function SelectField({
  name,
  label,
  value,
  options,
  labels,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  labels: Record<string, string>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={value} className="h-9 rounded-md border bg-background px-3 text-sm">
        <option value="">{copy.all}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </div>
  );
}
