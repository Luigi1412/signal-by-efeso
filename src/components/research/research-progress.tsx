"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t, ui } from "@/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { completeResearchAction, persistResearchProgressAction } from "@/server/actions/analysis-actions";
import type { Company, ResearchLiveSummary, ResearchPhase, ResearchPhaseStatus } from "@/types";
import { useResearchSimulation } from "./use-research-simulation";

interface ResearchProgressProps {
  company: Company;
  phases: ResearchPhase[];
  finalSummary: ResearchLiveSummary;
  analysisId?: string;
  runId?: string;
  initialCompletedCount?: number;
}

export function ResearchProgress({
  company,
  phases,
  finalSummary,
  analysisId,
  runId,
  initialCompletedCount = 0,
}: ResearchProgressProps) {
  const persistEnabled = Boolean(analysisId && runId);

  const { phaseStatuses, progress, summary, complete } = useResearchSimulation(phases, finalSummary, {
    initialCompletedCount,
    onPhase: (phaseIndex) => {
      if (!persistEnabled || !analysisId || !runId) return;
      void persistResearchProgressAction({ analysisId, runId, phaseIndex });
    },
    onComplete: () => {
      if (!persistEnabled || !analysisId || !runId) return;
      void completeResearchAction({ analysisId, runId });
    },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:gap-12">
      <div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-3">{ui.research.eyebrow}</div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              {complete ? ui.research.readyHeadline : t(ui.research.headline, { company: company.name })}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {complete ? t(ui.research.readySupporting, { company: company.name }) : ui.research.supporting}
            </p>
          </div>
          <span className="tabular shrink-0 text-sm font-medium text-muted-foreground">
            {Math.round(progress * 100)}%
          </span>
        </div>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-foreground/8" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn("h-full rounded-full transition-[width] duration-150 ease-linear", complete ? "bg-verified" : "bg-foreground")}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <ol className="mt-8 flex flex-col">
          {phases.map((phase, index) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              status={phaseStatuses[index]}
              isLast={index === phases.length - 1}
            />
          ))}
        </ol>

        <div
          className={cn(
            "mt-8 flex flex-col gap-3 rounded-lg border bg-card p-5 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between",
            complete ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0",
          )}
          aria-hidden={!complete}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-verified-muted text-verified">
              <Check className="size-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">{ui.research.readyCardTitle}</div>
              <div className="text-xs text-muted-foreground">
                {t(ui.research.readyCardMeta, {
                  claims: summary.verifiedClaims,
                  opportunities: summary.emergingOpportunities,
                  conflicts: summary.potentialConflicts,
                })}
              </div>
            </div>
          </div>
          <Button asChild variant="brand" size="lg" className="h-10 px-4" tabIndex={complete ? 0 : -1}>
            <Link href={routes.company(company.slug, analysisId)}>
              {ui.research.open}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      <aside className="lg:pt-14">
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{ui.research.liveSummary}</span>
            {!complete && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/30" />
                <span className="relative inline-flex size-2 rounded-full bg-foreground/70" />
              </span>
            )}
          </div>
          <dl className="divide-y">
            <SummaryRow label={ui.research.sourcesDiscovered} value={summary.sourcesDiscovered} />
            <SummaryRow label={ui.research.sourcesRetained} value={summary.sourcesRetained} />
            <SummaryRow label={ui.research.verifiedClaims} value={summary.verifiedClaims} />
            <SummaryRow label={ui.research.emergingOpportunities} value={summary.emergingOpportunities} />
            <SummaryRow label={ui.research.potentialConflict} value={summary.potentialConflicts} tone="conflict" />
          </dl>
        </div>
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          {ui.research.simulated}
        </p>
      </aside>
    </div>
  );
}

function PhaseRow({ phase, status, isLast }: { phase: ResearchPhase; status: ResearchPhaseStatus; isLast: boolean }) {
  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
            status === "done" && "border-foreground bg-foreground text-background",
            status === "active" && "border-foreground bg-background",
            status === "pending" && "border-border bg-background",
          )}
        >
          {status === "done" && <Check className="size-3" strokeWidth={2.5} />}
          {status === "active" && <span className="size-1.5 animate-pulse rounded-full bg-foreground" />}
        </span>
        {!isLast && (
          <span className={cn("w-px flex-1 transition-colors duration-300", status === "done" ? "bg-foreground/40" : "bg-border")} />
        )}
      </div>
      <div className={cn("pb-5 transition-opacity duration-300", status === "pending" && "opacity-45")}>
        <div className={cn("text-sm leading-5", status === "pending" ? "font-normal text-foreground" : "font-medium text-foreground")}>
          {phase.label}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {status === "active" ? `${phase.detail}…` : phase.detail}
        </div>
      </div>
    </li>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: number; tone?: "conflict" }) {
  return (
    <div className="flex items-baseline justify-between px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("tabular text-lg font-semibold tracking-tight", tone === "conflict" && value > 0 ? "text-conflict" : "text-foreground")}>
        {value}
      </dd>
    </div>
  );
}
