"use client";

import { ChevronRight, Search } from "lucide-react";
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { EvidenceTypeBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ui } from "@/i18n";
import { geographyLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { EvidenceClaim } from "@/types";

interface EvidenceTableProps {
  claims: EvidenceClaim[];
  selectedClaimId: string | null;
  onSelect: (claim: EvidenceClaim) => void;
}

export function EvidenceTable({ claims, selectedClaimId, onSelect }: EvidenceTableProps) {
  if (claims.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={ui.evidence.emptyTitle}
        description={ui.evidence.emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 pl-5">{ui.evidence.columns.claim}</TableHead>
            <TableHead className="h-10 w-32">{ui.evidence.columns.type}</TableHead>
            <TableHead className="h-10 w-40">{ui.evidence.columns.confidence}</TableHead>
            <TableHead className="h-10 w-24 text-right">{ui.evidence.columns.sources}</TableHead>
            <TableHead className="h-10 w-32">{ui.evidence.columns.geography}</TableHead>
            <TableHead className="h-10 w-10 pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => {
            const selected = claim.id === selectedClaimId;
            return (
              <TableRow
                key={claim.id}
                tabIndex={0}
                aria-selected={selected}
                data-state={selected ? "selected" : undefined}
                onClick={() => onSelect(claim)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(claim);
                  }
                }}
                className={cn(
                  "group cursor-pointer outline-none focus-visible:bg-muted/60",
                  selected && "bg-muted/60 hover:bg-muted/60",
                )}
              >
                <TableCell className="h-14 pl-5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{claim.claim}</span>
                    <span className="text-xs text-muted-foreground">{claim.period}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <EvidenceTypeBadge type={claim.type} />
                </TableCell>
                <TableCell>
                  <ConfidenceIndicator value={claim.confidence} />
                </TableCell>
                <TableCell className="tabular text-right">{claim.sourceIds.length}</TableCell>
                <TableCell className="text-muted-foreground">{geographyLabel[claim.geography]}</TableCell>
                <TableCell className="pr-4">
                  <ChevronRight className="size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
