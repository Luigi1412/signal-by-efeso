"use client";

import { useRouter } from "next/navigation";
import { KeyValue } from "@/components/shared/key-value";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { t, ui } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  formatSignalDate,
  formatSignalGeography,
  formatSignalSummaryForDisplay,
  formatSignalTitleForDisplay,
  signalMovementCategory,
} from "@/lib/signal-display";
import type { SignalDetail } from "@/server/signals/types";
import Link from "next/link";

const copy = ui.signals;

interface SignalDetailDrawerProps {
  detail: SignalDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeHref: string;
}

function importanceTone(importance: string): "strong" | "brand" | "neutral" {
  if (importance === "high") return "strong";
  if (importance === "medium") return "brand";
  return "neutral";
}

export function SignalDetailDrawer({ detail, open, onOpenChange, closeHref }: SignalDetailDrawerProps) {
  const router = useRouter();
  if (!detail) return null;
  const title = formatSignalTitleForDisplay(detail.title);
  const summary = formatSignalSummaryForDisplay(detail.summary);
  const intelligenceHref = detail.companySlug ? routes.companyTab(detail.companySlug, "intelligence") : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) router.replace(closeHref, { scroll: false });
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
        <SheetHeader className="gap-3 border-b px-6 pt-6 pb-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{detail.companyName}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={importanceTone(detail.importance)} dot={false} size="sm">
              {labelOf(ui.signalImportance, detail.importance)}
            </StatusBadge>
            <Badge variant="outline">{labelOf(ui.assertionMode, detail.assertionMode)}</Badge>
            {detail.demoOrigin ? (
              <Badge variant="outline" className="font-normal text-muted-foreground" title={copy.demoTooltip}>
                {copy.demoOrigin}
              </Badge>
            ) : null}
          </div>
          <SheetTitle className="text-lg leading-snug tracking-tight">{title}</SheetTitle>
          <SheetDescription className="sr-only">{t(copy.drawerAria, { title })}</SheetDescription>
          {intelligenceHref ? (
            <Link href={intelligenceHref} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {copy.viewAccountIntelligence}
            </Link>
          ) : null}
        </SheetHeader>
        <div className="flex flex-col gap-8 px-6 py-6">
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">{copy.whatHappened}</h3>
            <p className="text-sm leading-relaxed text-foreground">{summary}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <KeyValue label={copy.company}>{detail.companyName}</KeyValue>
              <KeyValue label={copy.importance}>{labelOf(ui.signalImportance, detail.importance)}</KeyValue>
              <KeyValue label={copy.assertionMode}>{labelOf(ui.assertionMode, detail.assertionMode)}</KeyValue>
              <KeyValue label={copy.geography}>{formatSignalGeography(detail.geography)}</KeyValue>
              <KeyValue label={copy.date}>{formatSignalDate(detail.eventDate ?? detail.createdAt)}</KeyValue>
              <KeyValue label={copy.type}>{copy.movement[signalMovementCategory(detail.signalType)]}</KeyValue>
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{copy.whyThisSignal}</h3>
            {detail.claims.length ? (
              <ul className="flex flex-col gap-3">
                {detail.claims.map((claim) => (
                  <li key={claim.id} className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {copy.claimRelationship[claim.relationshipType as keyof typeof copy.claimRelationship] ??
                        claim.relationshipType}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{claim.statement}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.none}</p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{copy.evidence}</h3>
            {detail.evidence.length ? (
              <ul className="flex flex-col gap-3">
                {detail.evidence.map((row, index) => (
                  <li key={`${row.snapshotId ?? "quote"}-${index}`} className="rounded-md border px-3 py-2">
                    <p className="text-sm leading-relaxed">&ldquo;{row.exactQuote}&rdquo;</p>
                    {row.snapshotId ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {copy.source}: {row.snapshotId}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.none}</p>
            )}
          </section>

          <details className="rounded-lg border bg-muted/20 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">{copy.technicalDetails}</summary>
            <div className="mt-4 flex flex-col gap-4">
              <KeyValue label={copy.type}>{labelOf(ui.signalType, detail.signalType)}</KeyValue>
              <KeyValue label={copy.nature}>{labelOf(ui.signalNature, detail.signalNature)}</KeyValue>
              <KeyValue label={copy.confidence}>{detail.confidenceTier}</KeyValue>
              <KeyValue label={copy.status}>{detail.status}</KeyValue>
              <KeyValue label={copy.tags}>
                {detail.tags.length ? detail.tags.map((tag) => tag.canonicalName).join(" · ") : copy.none}
              </KeyValue>
              <KeyValue label={copy.companies}>
                {detail.companies.length
                  ? detail.companies.map((row) => `${row.displayName} (${row.role})`).join(" · ")
                  : copy.none}
              </KeyValue>
              <KeyValue label={copy.provenance}>
                {[
                  detail.originSignalCandidateId ? `${copy.candidate}: ${detail.originSignalCandidateId}` : null,
                  detail.originModelRunId ? `${copy.modelRun}: ${detail.originModelRunId}` : null,
                  detail.sourceSnapshotId ? `${copy.snapshot}: ${detail.sourceSnapshotId}` : null,
                ]
                  .filter(Boolean)
                  .join("\n") || copy.none}
              </KeyValue>
              <KeyValue label={copy.validation}>
                {detail.validations.length
                  ? detail.validations.map((row) => `${row.validatorCode}: ${row.result}/${row.severity}`).join("\n")
                  : copy.none}
              </KeyValue>
            </div>
          </details>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
