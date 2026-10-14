"use client";

import { ui } from "@/i18n";
import { evidenceFilters, type EvidenceFilterId } from "@/lib/evidence-filters";
import { cn } from "@/lib/utils";

interface EvidenceFiltersProps {
  value: EvidenceFilterId;
  counts: Record<EvidenceFilterId, number>;
  onChange: (value: EvidenceFilterId) => void;
}

export function EvidenceFilters({ value, counts, onChange }: EvidenceFiltersProps) {
  return (
    <div role="tablist" aria-label={ui.workspace.tabs.evidence} className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {evidenceFilters.map((filter) => {
        const active = filter.id === value;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter.id)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              active ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
            <span className={cn("tabular text-[11px]", active ? "text-muted-foreground" : "text-muted-foreground/70")}>{counts[filter.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
