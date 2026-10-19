"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyValue } from "@/components/shared/key-value";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { t, ui } from "@/i18n";
import { EXPERTISE_CATEGORIES, knowledgeStatusLabel, knowledgeTagCategoryLabel, knowledgeTypeLabel } from "@/lib/knowledge-display";
import { routes } from "@/lib/routes";
import type { EfesoKnowledgeDetail, EfesoKnowledgeListItem } from "@/types/efeso-knowledge";

const OBJECT_TYPES = [
  "capability",
  "methodology",
  "service",
  "industry_expertise",
  "case",
  "credential",
  "result",
  "testimonial",
  "concept",
] as const;

const OBJECT_STATUSES = ["draft", "validated", "needs_review", "active", "archived"] as const;

const copy = ui.efesoKnowledge;

interface TaxonomyOptions {
  industries: string[];
  capabilities: string[];
  problems: string[];
  geographies: string[];
}

interface Filters {
  query: string;
  objectType: string;
  industry: string;
  capability: string;
  businessProblem: string;
  geography: string;
  status: string;
}

interface EfesoKnowledgeExplorerProps {
  items: EfesoKnowledgeListItem[];
  selected: EfesoKnowledgeDetail | null;
  taxonomy: TaxonomyOptions;
  filters: Filters;
  categoryCounts?: Record<string, number>;
}

export function EfesoKnowledgeExplorer({ items, selected, taxonomy, filters, categoryCounts = {} }: EfesoKnowledgeExplorerProps) {
  const [open, setOpen] = useState(Boolean(selected));
  const hasSecondaryFilters = Boolean(
    filters.query || filters.industry || filters.capability || filters.businessProblem || filters.geography,
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{copy.browse}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERTISE_CATEGORIES.map((type) => {
            const count = categoryCounts[type] ?? items.filter((item) => item.objectType === type).length;
            const active = filters.objectType === type;
            const params = keepFilters({ ...filters, objectType: active ? "" : type });
            return (
              <a
                key={type}
                href={params ? `${routes.expertise}?${params}` : routes.expertise}
                className={`rounded-lg border bg-card px-4 py-4 transition-colors hover:border-foreground/20 ${active ? "border-foreground/30" : ""}`}
              >
                <p className="text-sm font-semibold">{copy.categories[type]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{count}</p>
              </a>
            );
          })}
        </div>
      </section>

      <details className="rounded-lg border bg-card p-4" open={hasSecondaryFilters}>
        <summary className="cursor-pointer text-sm font-medium">{copy.filters}</summary>
        <form method="get" action={routes.expertise} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="q">{copy.query}</Label>
            <Input id="q" name="q" defaultValue={filters.query} />
          </div>
          <SelectField name="type" label={copy.objectType} value={filters.objectType} options={[...OBJECT_TYPES]} typeOptions />
          <SelectField name="status" label={copy.status} value={filters.status} options={[...OBJECT_STATUSES]} statusOptions />
          <SelectField name="industry" label={copy.industry} value={filters.industry} options={taxonomy.industries} />
          <SelectField name="capability" label={copy.capability} value={filters.capability} options={taxonomy.capabilities} />
          <SelectField name="problem" label={copy.businessProblem} value={filters.businessProblem} options={taxonomy.problems} />
          <SelectField name="geography" label={copy.geography} value={filters.geography} options={taxonomy.geographies} />
          <div className="flex items-end">
            <Button type="submit">{copy.search}</Button>
          </div>
        </form>
      </details>

      {items.length === 0 ? (
        <EmptyState title={copy.empty} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`${routes.expertise}?${keepFilters(filters, item.id)}`}
                className="block rounded-lg border bg-card px-4 py-4 hover:border-foreground/20"
                onClick={() => setOpen(true)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.canonicalName}</p>
                  <Badge variant="outline">{knowledgeTypeLabel(item.objectType)}</Badge>
                  {item.demoOrigin ? <Badge variant="outline">{copy.demoOrigin}</Badge> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.shortDescription}</p>
                <RelatedTags tags={item.tags} />
              </a>
            </li>
          ))}
        </ul>
      )}

      <KnowledgeObjectDrawer detail={selected} open={open && Boolean(selected)} onOpenChange={setOpen} filters={filters} />
    </div>
  );
}

function RelatedTags({ tags }: { tags: { category: string; canonicalName: string }[] }) {
  const industries = tags.filter((tag) => tag.category === "INDUSTRY").map((tag) => tag.canonicalName);
  const problems = tags.filter((tag) => tag.category === "BUSINESS_PROBLEM").map((tag) => tag.canonicalName);
  if (industries.length === 0 && problems.length === 0) return null;
  return (
    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
      {[...industries, ...problems].join(" · ")}
    </p>
  );
}

function keepFilters(filters: Filters, objectId?: string): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.objectType) params.set("type", filters.objectType);
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.capability) params.set("capability", filters.capability);
  if (filters.businessProblem) params.set("problem", filters.businessProblem);
  if (filters.geography) params.set("geography", filters.geography);
  if (filters.status && filters.status !== "active") params.set("status", filters.status);
  if (objectId) params.set("object", objectId);
  return params.toString();
}

function SelectField({
  name,
  label,
  value,
  options,
  typeOptions,
  statusOptions,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  typeOptions?: boolean;
  statusOptions?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={value} className="h-9 rounded-md border bg-background px-3 text-sm">
        <option value="">{copy.all}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {typeOptions ? knowledgeTypeLabel(option) : statusOptions ? knowledgeStatusLabel(option) : option}
          </option>
        ))}
      </select>
    </div>
  );
}

function KnowledgeObjectDrawer({
  detail,
  open,
  onOpenChange,
  filters,
}: {
  detail: EfesoKnowledgeDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Filters;
}) {
  const router = useRouter();
  if (!detail) return null;
  const industries = detail.tags.filter((tag) => tag.category === "INDUSTRY");
  const problems = detail.tags.filter((tag) => tag.category === "BUSINESS_PROBLEM");
  const otherTags = detail.tags.filter((tag) => tag.category !== "INDUSTRY" && tag.category !== "BUSINESS_PROBLEM");

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          const query = keepFilters(filters);
          router.replace(query ? `${routes.expertise}?${query}` : routes.expertise, { scroll: false });
        }
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
        <SheetHeader className="gap-3 border-b px-6 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{knowledgeTypeLabel(detail.objectType)}</Badge>
            {detail.demoOrigin ? <Badge variant="outline">{copy.demoOrigin}</Badge> : null}
          </div>
          <SheetTitle className="text-lg leading-snug tracking-tight">{detail.canonicalName}</SheetTitle>
          <SheetDescription className="sr-only">{t(copy.drawerAria, { name: detail.canonicalName })}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-6 py-6">
          <KeyValue label={copy.descriptionLabel}>{detail.shortDescription}</KeyValue>
          <KeyValue label={copy.relatedIndustries}>
            {industries.length ? industries.map((tag) => tag.canonicalName).join(" · ") : "—"}
          </KeyValue>
          <KeyValue label={copy.relatedProblems}>
            {problems.length ? problems.map((tag) => tag.canonicalName).join(" · ") : "—"}
          </KeyValue>
          {otherTags.length > 0 ? (
            <KeyValue label={copy.tags}>
              {otherTags.map((tag) => `${knowledgeTagCategoryLabel(tag.category)}: ${tag.canonicalName}`).join(" · ")}
            </KeyValue>
          ) : null}
          <section>
            <h3 className="eyebrow mb-2">{copy.relatedCases}</h3>
            {detail.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              detail.evidence.map((row) => (
                <blockquote key={`${row.blockId}-${row.exactQuote}`} className="mb-3 border-l-2 pl-3 text-sm">
                  {row.exactQuote}
                </blockquote>
              ))
            )}
          </section>
          {detail.relations.length > 0 ? (
            <section>
              <h3 className="eyebrow mb-2">{copy.relations}</h3>
              <ul className="space-y-1 text-sm">
                {detail.relations.map((relation) => (
                  <li key={relation.id}>{relation.relationType}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <details>
            <summary className="cursor-pointer text-sm font-medium">{ui.common.viewProvenance}</summary>
            <div className="mt-3 flex flex-col gap-4">
              <section>
                <h3 className="eyebrow mb-2">{copy.claims}</h3>
                {detail.claims.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {detail.claims.map((claim) => (
                      <li key={`${claim.id}-${claim.relationshipType}`}>{claim.statement}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="eyebrow mb-2">{copy.provenance}</h3>
                <dl className="grid gap-2 text-sm">
                  <div>
                    {copy.snapshot}: <span className="font-mono text-xs">{detail.provenance.snapshotId}</span>
                  </div>
                  <div>
                    {copy.candidate}: <span className="font-mono text-xs">{detail.provenance.candidateId ?? "—"}</span>
                  </div>
                  <div>
                    {copy.modelRun}: <span className="font-mono text-xs">{detail.provenance.modelRunId ?? "—"}</span>
                  </div>
                </dl>
              </section>
            </div>
          </details>
        </div>
      </SheetContent>
    </Sheet>
  );
}
