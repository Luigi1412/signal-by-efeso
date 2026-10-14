"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SectionHeading } from "@/components/shared/section-heading";
import { getConflictById, getOpportunityById, getSourceById, getSourcesByIds } from "@/data";
import { t, ui } from "@/i18n";
import type { CompanySignal, Conflict, EvidenceClaim } from "@/types";
import { ConflictCard } from "./conflict-card";
import { EvidenceDrawer } from "./evidence-drawer";
import type { EvidenceFilterId } from "@/lib/evidence-filters";
import { EvidenceFilters } from "./evidence-filters";
import { EvidenceTable } from "./evidence-table";

interface EvidenceExplorerProps {
  companySlug: string;
  claims: EvidenceClaim[];
  conflicts: Conflict[];
  signals: CompanySignal[];
  initialFilter: EvidenceFilterId;
  initialClaimId: string | null;
}

function isPrimaryOnly(claim: EvidenceClaim): boolean {
  return claim.sourceIds.every((id) => getSourceById(id)?.isPrimary);
}

function matchesFilter(claim: EvidenceClaim, filter: EvidenceFilterId): boolean {
  if (filter === "all") return true;
  if (filter === "primary") return isPrimaryOnly(claim);
  return claim.type === filter;
}

const emptySubscribe = () => () => undefined;

/** False during SSR and the hydration pass; true after the client has mounted. */
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function EvidenceExplorer({ companySlug, claims, conflicts, signals, initialFilter, initialClaimId }: EvidenceExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<EvidenceFilterId>(initialFilter);
  const [selectedId, setSelectedId] = useState<string | null>(initialClaimId);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialClaimId));

  const counts = useMemo<Record<EvidenceFilterId, number>>(
    () => ({
      all: claims.length,
      verified: claims.filter((c) => c.type === "verified").length,
      derived: claims.filter((c) => c.type === "derived").length,
      hypothesis: claims.filter((c) => c.type === "hypothesis").length,
      conflict: claims.filter((c) => c.type === "conflict").length,
      primary: claims.filter(isPrimaryOnly).length,
    }),
    [claims],
  );

  const visibleClaims = useMemo(() => claims.filter((c) => matchesFilter(c, filter)), [claims, filter]);
  const selectedClaim = claims.find((c) => c.id === selectedId) ?? null;

  function handleSelect(claim: EvidenceClaim) {
    setSelectedId(claim.id);
    setDrawerOpen(true);
  }

  function handleDrawerChange(open: boolean) {
    setDrawerOpen(open);
    if (!open && initialClaimId) {
      router.replace(pathname, { scroll: false });
    }
  }

  const showConflicts = filter === "all" || filter === "conflict";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <EvidenceFilters value={filter} counts={counts} onChange={setFilter} />
          <span className="text-xs text-muted-foreground">
            {t(ui.evidence.showing, { visible: visibleClaims.length, total: claims.length })}
          </span>
        </div>
        <EvidenceTable claims={visibleClaims} selectedClaimId={drawerOpen ? selectedId : null} onSelect={handleSelect} />
      </div>

      {showConflicts && conflicts.length > 0 && (
        <section>
          <SectionHeading
            as="h3"
            eyebrow={ui.evidence.conflictsEyebrow}
            title={ui.evidence.conflictsTitle}
            description={ui.evidence.conflictsDescription}
            className="mb-4"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {conflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </section>
      )}

      {hydrated && (
        <EvidenceDrawer
          claim={selectedClaim}
          sources={selectedClaim ? getSourcesByIds(selectedClaim.sourceIds) : []}
          conflict={selectedClaim?.conflictId ? getConflictById(selectedClaim.conflictId) : undefined}
          relatedSignal={selectedClaim ? signals.find((s) => s.id === selectedClaim.relatedSignalId || s.evidenceClaimId === selectedClaim.id) : undefined}
          relatedOpportunity={selectedClaim?.relatedOpportunityId ? getOpportunityById(selectedClaim.relatedOpportunityId) : undefined}
          companySlug={companySlug}
          open={drawerOpen}
          onOpenChange={handleDrawerChange}
        />
      )}
    </div>
  );
}
