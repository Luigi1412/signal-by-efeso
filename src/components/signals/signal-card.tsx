import Link from "next/link";
import { ArrowRight, Calculator, FileText } from "lucide-react";
import { EvidenceTypeBadge, StatusBadge } from "@/components/shared/status-badge";
import { t, ui } from "@/i18n";
import { geographyLabel, relevanceLabel, signalCategoryLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { CompanySignal } from "@/types";

interface SignalCardProps {
  signal: CompanySignal;
  companySlug: string;
  isLast?: boolean;
}

export function SignalCard({ signal, companySlug, isLast = false }: SignalCardProps) {
  const evidenceHref = `${routes.companyTab(companySlug, "evidence")}?claim=${signal.evidenceClaimId}`;
  const isDerived = signal.type === "derived";
  const sourcesLabel =
    signal.sourceIds.length === 1
      ? t(ui.signals.supportingSources, { count: signal.sourceIds.length })
      : t(ui.signals.supportingSourcesPlural, { count: signal.sourceIds.length });

  return (
    <li className="relative grid gap-3 sm:grid-cols-[140px_1fr] sm:gap-8">
      <div className="flex items-start gap-3 sm:flex-col sm:items-end sm:gap-1 sm:text-right">
        <time dateTime={signal.date} className="text-sm font-medium text-foreground">
          {signal.periodLabel}
        </time>
        <span className="text-xs text-muted-foreground">{signalCategoryLabel[signal.category]}</span>
      </div>

      <div className="relative sm:pl-8">
        <span
          aria-hidden
          className={cn(
            "absolute top-2.5 left-0 hidden size-2 -translate-x-1/2 rounded-full ring-4 ring-background sm:block",
            isDerived ? "bg-derived" : "bg-verified",
          )}
        />
        {!isLast && <span aria-hidden className="absolute top-5 bottom-[-28px] left-0 hidden w-px -translate-x-1/2 bg-border sm:block" />}

        <article className="rounded-lg border bg-card transition-colors hover:border-foreground/20">
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{signal.title}</h3>
              <EvidenceTypeBadge type={signal.type} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{signal.summary}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <dt>{ui.signals.geography}</dt>
                <dd className="font-medium text-foreground">{geographyLabel[signal.geography]}</dd>
              </div>
              {signal.brazilRelevance && (
                <div className="flex items-center gap-1.5">
                  <dt>{ui.signals.brazilRelevance}</dt>
                  <dd>
                    <StatusBadge tone={signal.brazilRelevance === "high" ? "strong" : "neutral"} dot={false} size="sm">
                      {relevanceLabel[signal.brazilRelevance]}
                    </StatusBadge>
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <FileText className="size-3" />
                <dd>{sourcesLabel}</dd>
              </div>
            </dl>

            <Link
              href={evidenceHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-4 hover:underline"
            >
              {isDerived ? (
                <>
                  <Calculator className="size-3.5" />
                  {ui.signals.viewCalculation}
                </>
              ) : (
                <>
                  {ui.signals.viewEvidence}
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Link>
          </div>
        </article>
      </div>
    </li>
  );
}
