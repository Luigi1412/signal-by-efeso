"use client";

import { ScopedLink as Link } from "@/components/local-preview/runtime";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
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
      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ui.companies.searchPlaceholder}
          aria-label={ui.companies.searchAria}
          className="h-12 border-0 border-b rounded-none bg-transparent pl-9 shadow-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.company}</th>
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.lastResearch}</th>
              <th className="py-3 pr-4 font-medium">{ui.companies.columns.outcome}</th>
              <th className="py-3 pr-4 font-medium tabular-nums">Movimentos</th>
              <th className="py-3 pr-4 font-medium tabular-nums">{ui.companies.columns.opportunities}</th>
              <th className="py-3 font-medium"><span className="sr-only">Abrir empresa</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.companyId} className="group border-b border-border/70 last:border-b-0 hover:bg-muted/40">
                <td className="py-6 pr-4">
                  <Link href={routes.company(row.slug)} className="text-base font-semibold tracking-tight text-foreground underline-offset-4 hover:underline">
                    {row.name}
                  </Link>
                  <p className="mt-1.5 text-xs text-muted-foreground">{[row.domain, row.industry, row.country].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="py-6 pr-4 text-muted-foreground">
                  {row.lastResearchedAt ? formatDate(row.lastResearchedAt) : ui.companies.none}
                </td>
                <td className="py-6 pr-4 text-[13px]"><span className="inline-flex items-center gap-2"><span aria-hidden className={`size-1.5 shrink-0 rounded-full ${row.outcome === "signal_found" ? "bg-brand" : "bg-muted-foreground/40"}`} />{row.outcome ? (({signal_found:"Movimento identificado",facts_only:"Somente fatos",insufficient_evidence:"Evidência insuficiente"} as Record<string,string>)[row.outcome] ?? row.outcomeLabel) : row.outcomeLabel}</span></td>
                <td className="py-6 pr-4 tabular-nums text-muted-foreground">{row.signalCount}</td>
                <td className="py-6 pr-4 tabular-nums text-muted-foreground">{row.opportunityCount}</td>
                <td className="py-6 text-right"><Link href={routes.company(row.slug)} aria-label={`Abrir ${row.name}`} className="inline-flex p-2 text-muted-foreground hover:text-brand"><ArrowUpRight size={16} /></Link></td>
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
