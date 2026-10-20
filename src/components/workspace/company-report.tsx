"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { CompanyBriefing } from "@/server/services/company-briefing-service";
import type { ExternalResearchRunRow, ExternalSourceCandidateRow } from "@/server/external-research/types";

interface CompanyReportProps {
  slug: string;
  briefing: CompanyBriefing;
  sources: ExternalSourceCandidateRow[];
  history: ExternalResearchRunRow[];
  demoMode?: boolean;
}

type TocSection = { id: string; number: string; title: string };

const RETAINED_SOURCE_STATUSES = new Set(["accepted", "fetched", "ingested", "processed"]);

export function CompanyReport({ slug, briefing, sources, history, demoMode = false }: CompanyReportProps) {
  const compact = !briefing.publishFullReport || briefing.outcome === "insufficient_evidence";
  const retainedSources = sources
    .filter((source) => RETAINED_SOURCE_STATUSES.has(source.status) || Boolean(source.snapshot_id))
    .filter((source) => source.status !== "rejected")
    .sort((left, right) => qualityRank(left.source_quality) - qualityRank(right.source_quality));
  const discardedSources = sources.filter((source) => source.status === "rejected");
  const limitations = briefing.researchLimitations;
  const companyRisks = briefing.reportRisks.filter((risk) => risk.kind === "company" || risk.kind === "hypothesis");

  const sections = useMemo(() => {
    const items: TocSection[] = [{ id: "resumo", number: "01", title: "Resumo executivo" }];
    if (!compact || briefing.validatedFacts.length > 0 || briefing.signals.length > 0) {
      items.push({ id: "movimentos", number: "02", title: "Movimentos e fatos" });
    }
    if (!compact && (briefing.meaningHeadline || briefing.meaningSummary || briefing.workingHypotheses.length > 0)) {
      items.push({ id: "leitura", number: "03", title: "O que isso pode significar" });
    }
    items.push({ id: "efeso", number: String(items.length + 1).padStart(2, "0"), title: "Aderências EFESO" });
    items.push({ id: "fontes", number: String(items.length + 1).padStart(2, "0"), title: "Fontes e limitações" });
    return items;
  }, [compact, briefing]);

  return (
    <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden print:hidden lg:block" data-print-hide>
        <div className="sticky top-24">
          <ReportToc sections={sections} />
        </div>
      </aside>

      <article className="min-w-0 rounded-xl border border-border/70 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)] print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-border/70 px-6 py-7 sm:px-8 sm:py-8">
          <p className="eyebrow text-brand">{ui.report.kicker.replace("{version}", "1")}</p>
          <h2 className="mt-3 max-w-[28ch] text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-foreground sm:text-[2rem]">
            {briefing.outcomeTitle}
          </h2>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.7] text-muted-foreground">{briefing.outcomeBody}</p>
          <IdentityBlock briefing={briefing} />
          {briefing.executionStatus ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Execução: <span className="font-medium text-foreground">{briefing.executionStatus.replaceAll("_", " ")}</span>
              {" · "}
              Resultado: <span className="font-medium text-foreground">{briefing.outcome}</span>
            </p>
          ) : null}
        </header>

        <div className="grid grid-cols-2 gap-px border-b border-border/70 bg-border/70 sm:grid-cols-4">
          <MetricTile label="Fatos" value={String(briefing.validatedFacts.length)} note="validados" />
          <MetricTile label="Sinais" value={String(briefing.signals.length)} note="ativos" />
          <MetricTile
            label="Fontes"
            value={String(retainedSources.length || briefing.sourceCount)}
            note={`${briefing.primarySourceCount} primária(s)`}
          />
          <MetricTile
            label="Oportunidades"
            value={String(briefing.opportunities.length)}
            note="sustentadas"
          />
        </div>

        <div className="flex flex-col gap-14 px-6 py-10 sm:px-8 sm:py-12">
          <Chapter id="resumo" number="01" title="Resumo executivo">
            <div className="space-y-4">
              <p className="max-w-[62ch] text-[15px] leading-[1.7] text-foreground/90">
                {briefing.reasons[0] ?? briefing.outcomeBody}
              </p>
              {briefing.signals.length === 0 ? (
                <p className="max-w-[62ch] text-sm text-muted-foreground">
                  Nenhum sinal foi promovido nesta execução.
                </p>
              ) : null}
              {briefing.opportunities.length === 0 ? (
                <p className="max-w-[62ch] text-sm text-muted-foreground">
                  Nenhuma oportunidade EFESO sustentada.
                </p>
              ) : null}
              {compact ? (
                <div className="rounded-lg border border-hypothesis-border/50 bg-hypothesis-muted/20 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Por que não concluímos</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {limitations.slice(0, 4).map((item) => (
                      <li key={item.id}>{item.text}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Chapter>

          {(!compact || briefing.validatedFacts.length > 0 || briefing.signals.length > 0) && (
            <Chapter id="movimentos" number="02" title="Movimentos e fatos relevantes">
              {briefing.signals.length > 0 ? (
                <div className="mb-6 space-y-3">
                  {briefing.signals.slice(0, 6).map((signal) => (
                    <div key={signal.id} className="border-l-2 border-brand/40 pl-4">
                      <h3 className="text-[15px] font-semibold text-foreground">{signal.title}</h3>
                      {signal.summary ? (
                        <p className="mt-1 text-sm text-muted-foreground">{signal.summary}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {briefing.validatedFacts.length === 0 ? (
                <EmptyCopy text="Nenhum fato material validado foi retido." />
              ) : (
                <div className="space-y-4">
                  {briefing.validatedFacts.slice(0, compact ? 3 : 12).map((fact) => (
                    <div key={fact.id}>
                      <p className="text-[15px] leading-relaxed text-foreground">{fact.statement}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fact.period} · {fact.sourceLabel} · {fact.modality}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Chapter>
          )}

          {!compact && (briefing.meaningHeadline || briefing.meaningSummary || briefing.workingHypotheses.length > 0) ? (
            <Chapter id="leitura" number="03" title="O que isso pode significar">
              {briefing.meaningHeadline ? (
                <p className="max-w-[62ch] text-[15px] font-medium text-foreground">{briefing.meaningHeadline}</p>
              ) : null}
              {briefing.meaningSummary ? (
                <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                  {briefing.meaningSummary}
                </p>
              ) : null}
              {briefing.workingHypotheses.map((hypothesis) => (
                <div key={hypothesis.id} className="mt-5 border-l-2 border-hypothesis/50 pl-4">
                  <StatusBadge tone="hypothesis" size="sm">
                    Hipótese
                  </StatusBadge>
                  <h3 className="mt-2 text-[15px] font-semibold">{hypothesis.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{hypothesis.summary}</p>
                </div>
              ))}
              {companyRisks.length > 0 ? (
                <div className="mt-6 space-y-2">
                  <p className="eyebrow">Riscos da empresa / hipóteses</p>
                  {companyRisks.map((risk) => (
                    <p key={risk.id} className="text-sm text-muted-foreground">
                      {risk.text}
                    </p>
                  ))}
                </div>
              ) : null}
            </Chapter>
          ) : null}

          <Chapter id="efeso" number={sections.find((s) => s.id === "efeso")?.number ?? "04"} title="Possíveis aderências EFESO">
            <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{briefing.efesoFitMessage}</p>
            {briefing.topFit ? (
              <p className="mt-3 text-sm text-foreground">
                <span className="font-medium">{briefing.topFit.name}</span> — {briefing.topFit.level}
              </p>
            ) : null}
            {briefing.opportunities.length > 0 ? (
              <div className="mt-4 space-y-3">
                {briefing.opportunities.map((opportunity) => (
                  <div key={opportunity.id}>
                    <h3 className="text-[15px] font-semibold">{opportunity.title}</h3>
                    {opportunity.summary ? (
                      <p className="mt-1 text-sm text-muted-foreground">{opportunity.summary}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Chapter>

          <Chapter
            id="fontes"
            number={sections.find((s) => s.id === "fontes")?.number ?? "05"}
            title="Fontes e limitações"
            description={
              retainedSources.length > 0
                ? `${retainedSources.length} retida(s)${discardedSources.length > 0 ? ` · ${discardedSources.length} descartada(s)` : ""}.`
                : undefined
            }
          >
            {retainedSources.length === 0 ? (
              <EmptyCopy text="Nenhuma fonte pública retida nesta pesquisa." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/80">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 text-xs">Fonte</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Editor</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Tipo</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Qualidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retainedSources.map((source) => (
                      <TableRow key={source.id} className="hover:bg-transparent">
                        <TableCell className="max-w-[280px] px-4 py-3 text-sm font-medium">
                          <a href={source.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                            {source.title || source.publisher || source.url}
                          </a>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {source.publisher || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {source.source_type.replaceAll("_", " ")}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {(source.source_quality ?? "—").replaceAll("_", " ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {limitations.length > 0 ? (
              <div className="mt-5 space-y-2">
                <p className="eyebrow">Limitações da pesquisa</p>
                {limitations.map((item) => (
                  <p key={item.id} className="text-sm text-muted-foreground">
                    {item.text}
                  </p>
                ))}
              </div>
            ) : null}

            {briefing.phaseTimings.length > 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Tempos:{" "}
                {briefing.phaseTimings.map((row) => `${row.phase} ${(row.ms / 1000).toFixed(1)}s`).join(" · ")}
              </p>
            ) : null}

            {discardedSources.length > 0 ? (
              <details className="mt-5 rounded-lg border border-border/70 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Fontes descartadas ({discardedSources.length})
                </summary>
                <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                  {discardedSources.slice(0, 40).map((source) => (
                    <p key={source.id} className="text-sm text-muted-foreground">
                      <span className="text-foreground">{source.title || source.publisher || source.url}</span>
                      {source.rejection_reason ? ` — ${rejectionReasonLabel(source.rejection_reason)}` : null}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}

            {history.length > 0 ? (
              <p className="mt-6 text-sm">
                <Link href={routes.research(history[0]!.id)} className="underline-offset-4 hover:underline">
                  Abrir run mais recente
                </Link>
              </p>
            ) : null}
          </Chapter>
        </div>

        <footer className="border-t border-border/70 px-6 py-4 text-xs text-muted-foreground sm:px-8">
          {demoMode
            ? ui.report.footer
            : "Signal by EFESO · Uso interno · Pesquisa baseada em fontes públicas recuperadas nesta execução."}
          <span className="sr-only">{slug}</span>
        </footer>
      </article>
    </div>
  );
}

function IdentityBlock({ briefing }: { briefing: CompanyBriefing }) {
  const canonical = briefing.canonicalName;
  const queried = briefing.queriedName;
  const corp = briefing.corporateCountry;
  const geo = briefing.researchGeography;
  if (!canonical && !queried && !corp && !geo) return null;
  return (
    <dl className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
      {canonical ? (
        <div>
          <dt className="text-[11px] font-medium tracking-wide uppercase">Entidade analisada</dt>
          <dd className="mt-0.5 font-medium text-foreground">{canonical}</dd>
        </div>
      ) : null}
      {queried && queried !== canonical ? (
        <div>
          <dt className="text-[11px] font-medium tracking-wide uppercase">Consulta do usuário</dt>
          <dd className="mt-0.5 text-foreground">{queried}</dd>
        </div>
      ) : null}
      {corp ? (
        <div>
          <dt className="text-[11px] font-medium tracking-wide uppercase">País / domicílio da entidade</dt>
          <dd className="mt-0.5 text-foreground">{corp}</dd>
        </div>
      ) : null}
      {geo ? (
        <div>
          <dt className="text-[11px] font-medium tracking-wide uppercase">Escopo da pesquisa</dt>
          <dd className="mt-0.5 text-foreground">{geo}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function ReportToc({ sections }: { sections: TocSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(`report-${section.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id.replace("report-", ""));
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={ui.report.contents} className="flex flex-col gap-0.5">
      <div className="eyebrow mb-2 px-2">{ui.report.contents}</div>
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <a
            key={section.id}
            href={`#report-${section.id}`}
            aria-current={active ? "location" : undefined}
            className={cn(
              "flex items-baseline gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("tabular w-5 shrink-0 text-[11px]", active ? "text-brand" : "text-muted-foreground/70")}>
              {section.number}
            </span>
            <span className="truncate">{section.title}</span>
          </a>
        );
      })}
    </nav>
  );
}

function Chapter({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`report-${id}`} className="scroll-mt-28">
      <header className="mb-6 flex items-baseline gap-4 border-b border-border/70 pb-3">
        <span className="tabular text-sm font-medium text-brand">{number}</span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function MetricTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-card px-4 py-4 sm:px-5">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{text}</p>;
}

function qualityRank(quality: string | null | undefined): number {
  if (quality === "primary") return 0;
  if (quality === "authoritative_secondary") return 1;
  if (quality === "secondary") return 2;
  return 3;
}

function rejectionReasonLabel(reason: string): string {
  switch (reason) {
    case "ecommerce_noise":
      return "página de e-commerce";
    case "social_media":
      return "rede social";
    case "off_topic_company":
      return "fora do escopo da empresa";
    case "homepage_shell":
      return "homepage genérica";
    case "thin_content":
      return "conteúdo insuficiente";
    case "outside_horizon":
      return "fora do horizonte temporal";
    case "weak_source":
      return "fonte fraca";
    case "impostor_domain":
      return "domínio impostor";
    case "noise_url":
      return "URL de baixo sinal";
    default:
      return reason.replaceAll("_", " ");
  }
}
