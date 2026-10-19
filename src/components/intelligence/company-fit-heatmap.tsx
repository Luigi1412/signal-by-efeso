"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ui } from "@/i18n";
import type { CompanyFitHeatmapCell, EfesoFitView } from "@/server/intelligence/types";

const copy = ui.heatmap;

interface CompanyFitHeatmapProps {
  companies: { id: string; name: string; slug: string }[];
  offerings: { id: string; name: string; objectType: string }[];
  cells: CompanyFitHeatmapCell[];
  explanations?: EfesoFitView[];
}

export function CompanyFitHeatmap({ companies, offerings, cells, explanations = [] }: CompanyFitHeatmapProps) {
  const [selected, setSelected] = useState<CompanyFitHeatmapCell | null>(null);
  const byKey = useMemo(() => {
    const map = new Map<string, CompanyFitHeatmapCell>();
    for (const cell of cells) map.set(`${cell.companyId}:${cell.knowledgeObjectId}`, cell);
    return map;
  }, [cells]);

  if (companies.length === 0 || offerings.length === 0) {
    return <p className="text-sm text-muted-foreground">{copy.empty}</p>;
  }

  const detail = selected ? explanations.find((fit) => fit.id === selected.fitId) : null;

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-3 py-2 font-medium">{ui.accountsIntelligence.company}</th>
            {offerings.map((offering) => (
              <th key={offering.id} className="px-3 py-2 font-medium">
                {offering.name}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{offering.objectType}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{company.name}</td>
              {offerings.map((offering) => {
                const cell = byKey.get(`${company.id}:${offering.id}`);
                const level = cell?.fitLevel;
                return (
                  <td key={offering.id} className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted/50"
                      onClick={() => setSelected(cell ?? null)}
                      disabled={!cell?.fitId}
                    >
                      {level ? String(level) : copy.none}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selected?.companyName} × {selected?.knowledgeName}
            </SheetTitle>
            <SheetDescription>{ui.relevantKnowledge.matchedBecause}</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Badge variant="secondary">{selected.fitLevel ?? copy.none}</Badge>
              {detail ? (
                <>
                  <p>{detail.fitReasonSummary}</p>
                  <ul className="space-y-2">
                    {detail.components.map((component) => (
                      <li key={`${component.componentType}-${component.componentValue}`} className="rounded-md border px-3 py-2">
                        {component.componentType}: {component.componentValue}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-muted-foreground">{copy.empty}</p>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
