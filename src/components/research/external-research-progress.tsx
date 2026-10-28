"use client";

import { ScopedLink as Link, useLocalPreview } from "@/components/local-preview/runtime";
import { researchOutcomeMemberCopy } from "@/server/product/research-outcome";
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
  resumeExternalResearchAction,
  startExternalResearchAction,
  tickExternalResearchAction,
  type ResearchView,
} from "@/server/actions/external-research-actions";
import { RESEARCH_PHASES } from "@/server/external-research/types";

// Group existing pipeline states for members; never synthesize progress or percentages.
const MEMBER_PHASES = [
  { statuses: ["queued", "resolving_entity"], label: "Identificando empresa" },
  { statuses: ["discovering_sources"], label: "Pesquisando fontes" },
  { statuses: ["reviewing_sources"], label: "Selecionando fontes relevantes" },
  { statuses: ["ingesting_sources", "extracting_claims"], label: "Extraindo e validando fatos" },
  { statuses: ["generating_signals"], label: "Analisando movimentos" },
  { statuses: ["generating_intelligence", "generating_opportunities"], label: "Avaliando aderência EFESO" },
  { statuses: ["generating_actions"], label: "Preparando resultado" },
];

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

function sourceStatusLabel(status: string): string {
  if (status === "rejected") {
    return "Descartada";
  }
  if (status === "fetched" || status === "ingested" || status === "processed") return "Consultada";
  if (status === "accepted") return "Selecionada";
  return ({discovered:"Encontrada",failed:"Falha de acesso",unavailable:"Indisponível"} as Record<string,string>)[status] ?? "Em avaliação";
}

export function ExternalResearchProgress({ initial }: { initial: ResearchView }) {
  const preview = useLocalPreview();
  const tick = preview?.tick ?? tickExternalResearchAction;
  const resolve = preview?.resolve ?? resolveResearchEntityAction;
  const start = preview?.start ?? startExternalResearchAction;
  const cancel = preview?.cancel ?? cancelExternalResearchAction;
  const resume = preview?.resume ?? resumeExternalResearchAction;
  const [view, setView] = useState(initial);
  const [tickKey, setTickKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const [manualDomain, setManualDomain] = useState("");
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (preview) return;
    const terminal = ["completed", "partial", "failed", "cancelled", "needs_user_resolution"].includes(view.status);
    if (terminal) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await tick(view.id);
          if (result.ok) {
            setView(result.run);
            setPollError(null);
          } else {
            setPollError(result.error);
          }
        } catch {
          setPollError("A atualização do progresso falhou temporariamente. Tentando novamente…");
        } finally {
          setTickKey((value) => value + 1);
        }
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [view.id, view.status, tickKey, preview, tick]);

  const currentIndex = MEMBER_PHASES.findIndex(phase => phase.statuses.includes(view.status));
  const done = view.status === "completed" || view.status === "partial";
  const failed = view.status === "failed" || view.status === "cancelled";


  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-14">
      <div>
        <div className="eyebrow mb-3">{ui.externalResearch.eyebrow}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          {done
            ? (view.outcome ? researchOutcomeMemberCopy(view.outcome).title : ui.externalResearch.completedHeadline)
            : failed
              ? ui.externalResearch.failed
              : `Pesquisando ${view.query}`}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {done
            ? view.status === "partial"
              ? (view.failureReason ?? ui.externalResearch.partialMessage)
              : (view.outcome ? researchOutcomeMemberCopy(view.outcome).body : ui.externalResearch.completedSupporting)
            : failed
              ? (view.failureReason ?? ui.externalResearch.failed)
              : (view.memberProgress ?? ui.externalResearch.supporting)}
        </p>

        <div className="mt-7 border-l-2 border-brand pl-5" role="status" aria-live="polite">
          <p className="eyebrow">{done ? "Pesquisa concluída" : failed ? "Pesquisa interrompida" : "Agora"}</p>
          <p className="mt-2 text-xl font-medium tracking-tight">{done ? "Resultado disponível" : failed ? "Consulte os detalhes abaixo" : currentIndex >= 0 ? MEMBER_PHASES[currentIndex]!.label : view.status === "needs_user_resolution" ? "Confirme a empresa" : "Preparando pesquisa"}</p>
          {!done && !failed && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Você pode navegar pelo SIGNAL. O progresso é atualizado enquanto esta página estiver aberta.</p>}
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
                          const result = await resolve({ runId: view.id, domain: candidate.domain });
                          if (result.ok) {
                            const next = await tick(view.id);
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
                        const result = await resolve({ runId: view.id, domain });
                        if (result.ok) {
                          const next = await tick(view.id);
                          if (next.ok) setView(next.run);
                          return;
                        }
                      }
                      const restarted = await start({
                        query: view.query,
                        confirmUnresolved: true,
                        selectedDomain: domain || undefined,
                      });
                      if (restarted.ok) {
                        const next = await tick(restarted.runId);
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
        ) : currentIndex >= 0 && !done && !failed ? (
          <ol className="mt-8 flex flex-col" aria-label="Etapas da pesquisa">
            {MEMBER_PHASES.map((phase, index) => {
              const status = index < currentIndex ? "done" : index === currentIndex ? "active" : "pending";
              const detail = status === "active" ? phaseDetail(view, view.status as (typeof RESEARCH_PHASES)[number]["status"]) : null;
              return (
                <li key={phase.label} aria-current={status === "active" ? "step" : undefined} className={cn("relative flex gap-4", status === "pending" && "text-muted-foreground")}>
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
                      {status === "active" ? <span className="size-1.5 rounded-full bg-foreground" /> : null}
                    </span>
                    {index < MEMBER_PHASES.length - 1 ? (
                      <span className={cn("w-px flex-1", status === "done" ? "bg-foreground/40" : "bg-border")} />
                    ) : null}
                  </div>
                  <div className="pb-4">
                    <div className={cn("text-sm", status === "active" ? "font-semibold text-foreground" : "text-muted-foreground")}>{phase.label}</div>
                    {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
                    {status === "active" && view.status === "generating_intelligence" ? (
                      <p className="mt-1 text-xs text-muted-foreground">{ui.externalResearch.evaluatingFit}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}

        {(done || view.initialAnalysisAvailable) && view.companySlug ? (
          <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">
                {done ? ui.externalResearch.completedHeadline : ui.externalResearch.initialAnalysisAvailable}
              </div>
              <div className="text-xs text-muted-foreground">
                {[view.acceptedCount > 0 ? `${view.acceptedCount} fontes retidas` : null, (view.counts?.claims ?? 0) > 0 ? `${view.counts?.claims} fatos validados` : null].filter(Boolean).join(" · ")}
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

        {pollError && !failed ? (
          <p role="status" className="mt-4 text-xs text-muted-foreground">{pollError}</p>
        ) : null}

        {failed ? (
          <Button
            type="button"
            variant="brand"
            className="mt-6"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  const result = await resume(view.id);
                  if (result.ok) {
                    setView(result.run);
                    setPollError(null);
                    setTickKey((value) => value + 1);
                  } else {
                    setPollError(result.error);
                  }
                } catch {
                  setPollError("Não foi possível retomar a pesquisa. Tente novamente.");
                }
              });
            }}
          >
            {ui.externalResearch.resume}
          </Button>
        ) : null}

        {!done && !failed && view.status !== "needs_user_resolution" ? (
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await cancel(view.id);
                  const next = await tick(view.id);
                  if (next.ok) setView(next.run);
                } catch {
                  setPollError("Não foi possível cancelar a pesquisa.");
                }
              });
            }}
          >
            {ui.externalResearch.cancel}
          </Button>
        ) : null}
      </div>

      <aside className="lg:pt-14">
        {view.sourceCount > 0 && <div className="border-y">
          <div className="py-3 text-sm font-semibold">{ui.externalResearch.sourcesReviewed}</div>
          <dl className="divide-y border-t">
            <div className="flex justify-between py-3 text-sm">
              <dt className="text-muted-foreground">{ui.externalResearch.found}</dt>
              <dd className="tabular font-semibold">{view.sourceCount}</dd>
            </div>
            <div className="flex justify-between py-3 text-sm">
              <dt className="text-muted-foreground">Fontes retidas</dt>
              <dd className="tabular font-semibold">{view.acceptedCount}</dd>
            </div>
            {(view.counts?.claims ?? 0) > 0 && <div className="flex justify-between py-3 text-sm"><dt className="text-muted-foreground">Fatos validados</dt><dd className="tabular font-semibold">{view.counts?.claims}</dd></div>}
            {view.rejectedCount > 0 ? (
              <div className="flex justify-between py-3 text-sm">
                <dt className="text-muted-foreground">Descartadas</dt>
                <dd className="tabular font-semibold">{view.rejectedCount}</dd>
              </div>
            ) : null}
          </dl>
        </div>}
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
                    {[source.publisher, source.publishedAt, sourceStatusLabel(source.status)]
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
