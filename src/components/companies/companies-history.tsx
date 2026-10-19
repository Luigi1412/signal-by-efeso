"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { CompanyHistoryRow } from "@/server/services/companies-history-service";

export function CompaniesHistory({ rows }: { rows: CompanyHistoryRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = [row.name, row.domain, row.industry, row.country].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-16">
        <p className="text-base text-muted-foreground">{ui.companies.empty}</p>
        <Button asChild variant="brand">
          <Link href={routes.researchNew}>{ui.companies.emptyCta}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ui.companies.searchPlaceholder}
          aria-label={ui.companies.searchAria}
          className="h-10 pl-9"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.company}</th>
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.industry}</th>
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.country}</th>
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.lastResearch}</th>
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.outcome}</th>
              <th className="py-3 pr-4 font-medium tabular-nums">{ui.companies.columns.signals}</th>
              <th className="py-3 pr-4 font-medium tabular-nums">{ui.companies.columns.opportunities}</th>
              <th className="py-3 font-medium">{ui.companies.columns.lastUpdated}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.companyId} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="py-3.5 pr-4">
                  <Link href={routes.company(row.slug)} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {row.name}
                  </Link>
                  {row.domain ? <p className="mt-0.5 text-xs text-muted-foreground">{row.domain}</p> : null}
                </td>
                <td className="py-3.5 pr-4 text-muted-foreground">{row.industry || ui.companies.none}</td>
                <td className="py-3.5 pr-4 text-muted-foreground">{row.country || ui.companies.none}</td>
                <td className="py-3.5 pr-4 text-muted-foreground">
                  {row.lastResearchedAt ? formatDate(row.lastResearchedAt) : ui.companies.none}
                </td>
                <td className="py-3.5 pr-4">{row.outcomeLabel}</td>
                <td className="py-3.5 pr-4 tabular-nums">{row.signalCount}</td>
                <td className="py-3.5 pr-4 tabular-nums">{row.opportunityCount}</td>
                <td className="py-3.5 text-muted-foreground">
                  {row.updatedAt || row.lastResearchedAt
                    ? formatDate(row.updatedAt ?? row.lastResearchedAt)
                    : ui.companies.none}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma empresa corresponde à busca.</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t(ui.companies.showing, { shown: filtered.length })}</p>
      )}
    </div>
  );
}
