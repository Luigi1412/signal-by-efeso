"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  cancelExternalResearchAction,
  resolveResearchEntityAction,
  startExternalResearchAction,
  tickExternalResearchAction,
  type ResearchView,
} from "@/server/actions/external-research-actions";
import { RESEARCH_PHASES } from "@/server/external-research/types";

const PHASE_LABELS: Record<(typeof RESEARCH_PHASES)[number]["labelKey"], string> = {
  identifying: ui.externalResearch.phases.identifying,
  findingSources: ui.externalResearch.phases.findingSources,
  validatingSources: ui.externalResearch.phases.validatingSources,
  processingDocuments: ui.externalResearch.phases.processingDocuments,
  extractingFacts: ui.externalResearch.phases.extractingFacts,
  generatingSignals: ui.externalResearch.phases.generatingSignals,
  buildingIntelligence: ui.externalResearch.phases.buildingIntelligence,
  identifyingOpportunities: ui.externalResearch.phases.identifyingOpportunities,
  preparingNextSteps: ui.externalResearch.phases.preparingNextSteps,
};

function phaseDetail(view: ResearchView, status: (typeof RESEARCH_PHASES)[number]["status"]): string | null {
  if (status === "discovering_sources" && view.sourceCount > 0) {
    return `${view.sourceCount} fontes encontradas`;
  }
  if (status === "reviewing_sources" && view.acceptedCount > 0) {
    return `${view.acceptedCount} fontes retidas`;
  }
  if (status === "extracting_claims" && (view.counts?.claims ?? 0) > 0) {
    return `${view.counts?.claims} evidências identificadas`;
  }
  if (status === "generating_signals" && (view.counts?.signals ?? 0) > 0) {
    return `${view.counts?.signals} sinais em avaliação`;
  }
  if (status === "generating_opportunities" && (view.counts?.opportunities ?? 0) > 0) {
    return `${view.counts?.opportunities} oportunidades em avaliação`;
  }
  return null;
}

function sourceStatusLabel(status: string, rejectionReason: string | null): string {
  if (status === "rejected") {
    return rejectionReason ? `Descartada — ${rejectionReason}` : "Descartada";
  }
  if (status === "accepted" || status === "ingested" || status === "processed") return "Retida";
  return status;
}

export function ExternalResearchProgress({ initial }: { initial: ResearchView }) {
  const [view, setView] = useState(initial);
  const [tickKey, setTickKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const [manualDomain, setManualDomain] = useState("");

  useEffect(() => {
    const terminal = ["completed", "partial", "failed", "cancelled", "needs_user_resolution"].includes(view.status);
    if (terminal) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await tickExternalResearchAction(view.id);
        if (result.ok) setView(result.run);
        else setTickKey((value) => value + 1);
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [view.id, view.status, tickKey]);

  const currentIndex = RESEARCH_PHASES.findIndex((phase) => phase.status === view.status);
  const done = view.status === "completed" || view.status === "partial";
  const failed = view.status === "failed" || view.status === "cancelled";
  const progress = done
    ? 1
    : failed
      ? Math.max(currentIndex, 0) / RESEARCH_PHASES.length
      : (Math.max(currentIndex, 0) + 0.35) / RESEARCH_PHASES.length;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-14">
      <div>
        <div className="eyebrow mb-3">{ui.externalResearch.eyebrow}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          {done
            ? ui.externalResearch.completedHeadline
            : failed
              ? ui.externalResearch.failed
              : ui.externalResearch.headline}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {done
            ? view.status === "partial"
              ? (view.failureReason ?? ui.externalResearch.partialMessage)
              : ui.externalResearch.completedSupporting
            : failed
              ? (view.failureReason ?? ui.externalResearch.failed)
              : (view.memberProgress ?? ui.externalResearch.supporting)}
        </p>

        <div
          className="mt-5 h-1 overflow-hidden rounded-full bg-foreground/8"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-150", done ? "bg-verified" : "bg-foreground")}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {view.status === "needs_user_resolution" ? (
          <div className="mt-6 border-t pt-6">
            <p className="text-sm font-medium">
              {view.candidates.length > 0 ? ui.companyReport.ambiguousTitle : ui.companyReport.unresolvedWarning}
            </p>
            {view.candidates.length > 0 ? (
              <ul className="mt-4 divide-y border-y">
                {view.candidates.map((candidate) => (
                  <li key={candidate.domain || candidate.name} className="flex items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[candidate.country, candidate.domain].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await resolveResearchEntityAction({ runId: view.id, domain: candidate.domain });
                          if (result.ok) {
                            const next = await tickExternalResearchAction(view.id);
                            if (next.ok) setView(next.run);
                          }
                        });
                      }}
                    >
                      Selecionar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <Input
                  value={manualDomain}
                  onChange={(event) => setManualDomain(event.target.value)}
                  placeholder="empresa.com.br"
                  className="h-10 max-w-sm"
                />
                <Button
                  type="button"
                  variant="brand"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const domain = manualDomain.trim();
                      if (domain) {
                        const result = await resolveResearchEntityAction({ runId: view.id, domain });
                        if (result.ok) {
                          const next = await tickExternalResearchAction(view.id);
                          if (next.ok) setView(next.run);
                          return;
                        }
                      }
                      const restarted = await startExternalResearchAction({
                        query: view.query,
                        confirmUnresolved: true,
                        selectedDomain: domain || undefined,
                      });
                      if (restarted.ok) {
                        const next = await tickExternalResearchAction(restarted.runId);
                        if (next.ok) setView(next.run);
                      }
                    });
                  }}
                >
                  {ui.companyReport.continueAnyway}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ol className="mt-8 flex flex-col">
            {RESEARCH_PHASES.map((phase, index) => {
              const status = done || index < currentIndex ? "done" : index === currentIndex ? "active" : "pending";
              const detail = status === "active" || status === "done" ? phaseDetail(view, phase.status) : null;
              return (
                <li key={phase.status} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        status === "done" && "border-foreground bg-foreground text-background",
                        status === "active" && "border-foreground bg-background",
                        status === "pending" && "border-border bg-background",
                      )}
                    >
                      {status === "done" ? <Check className="size-3" strokeWidth={2.5} /> : null}
                      {status === "active" ? <span className="size-1.5 animate-pulse rounded-full bg-foreground" /> : null}
                    </span>
                    {index < RESEARCH_PHASES.length - 1 ? (
                      <span className={cn("w-px flex-1", status === "done" ? "bg-foreground/40" : "bg-border")} />
                    ) : null}
                  </div>
                  <div className={cn("pb-5", status === "pending" && "opacity-45")}>
                    <div className="text-sm font-medium text-foreground">{PHASE_LABELS[phase.labelKey]}</div>
                    {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
                    {status === "active" && phase.status === "generating_intelligence" ? (
                      <p className="mt-1 text-xs text-muted-foreground">{ui.externalResearch.evaluatingFit}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {(done || view.initialAnalysisAvailable) && view.companySlug ? (
          <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">
                {done ? ui.externalResearch.completedHeadline : ui.externalResearch.initialAnalysisAvailable}
              </div>
              <div className="text-xs text-muted-foreground">
                {view.acceptedCount} {ui.externalResearch.acceptedSources}
                {view.counts
                  ? ` · ${view.counts.claims} ${ui.externalResearch.claims} · ${view.counts.signals} ${ui.externalResearch.signals} · ${view.counts.opportunities} ${ui.externalResearch.opportunities}`
                  : ""}
              </div>
            </div>
            <Button asChild variant="brand">
              <Link href={routes.company(view.companySlug, view.analysisId ?? undefined)}>
                {ui.externalResearch.openCompany}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        ) : null}

        {!done && !failed && view.status !== "needs_user_resolution" ? (
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await cancelExternalResearchAction(view.id);
                const next = await tickExternalResearchAction(view.id);
                if (next.ok) setView(next.run);
              });
            }}
          >
            {ui.externalResearch.cancel}
          </Button>
        ) : null}
      </div>

      <aside className="lg:pt-14">
        <div className="border-y">
          <div className="py-3 text-sm font-semibold">{ui.externalResearch.sourcesReviewed}</div>
          <dl className="divide-y border-t">
            <div className="flex justify-between py-3 text-sm">
              <dt className="text-muted-foreground">{ui.externalResearch.found}</dt>
              <dd className="tabular font-semibold">{view.sourceCount}</dd>
            </div>
            <div className="flex justify-between py-3 text-sm">
              <dt className="text-muted-foreground">{ui.externalResearch.processed}</dt>
              <dd className="tabular font-semibold">{view.acceptedCount}</dd>
            </div>
            {view.rejectedCount > 0 ? (
              <div className="flex justify-between py-3 text-sm">
                <dt className="text-muted-foreground">Descartadas</dt>
                <dd className="tabular font-semibold">{view.rejectedCount}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        {view.sources.length > 0 ? (
          <div className="mt-6">
            <p className="text-sm font-semibold">{ui.externalResearch.analyzedSources}</p>
            <ul className="mt-3 space-y-3">
              {view.sources.slice(0, 12).map((source) => (
                <li key={source.id} className="text-xs text-muted-foreground">
                  <a
                    href={source.url}
                    className="text-foreground underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title || source.publisher}
                  </a>
                  <span className="mt-0.5 block">
                    {[source.publisher, source.publishedAt, sourceStatusLabel(source.status, source.rejectionReason)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
