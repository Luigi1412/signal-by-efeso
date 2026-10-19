import Link from "next/link";
import { ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { CompanyBriefing } from "@/server/services/company-briefing-service";
import type { ExternalResearchRunRow, ExternalSourceCandidateRow } from "@/server/external-research/types";

interface FindingItem {
  id: string;
  kind: "fact" | "signal" | "hypothesis";
  title: string;
  description?: string | null;
  evidence?: string | null;
  date?: string | null;
  status?: string | null;
  source?: string | null;
}

interface RiskItem {
  id: string;
  text: string;
}

interface CompanyReportProps {
  slug: string;
  briefing: CompanyBriefing;
  sources: ExternalSourceCandidateRow[];
  history: ExternalResearchRunRow[];
}

function kindLabel(kind: FindingItem["kind"]): string {
  if (kind === "signal") return ui.companyReport.signal;
  if (kind === "hypothesis") return ui.companyReport.hypothesis;
  return ui.companyReport.fact;
}

export function CompanyReport({ slug, briefing, sources, history }: CompanyReportProps) {
  const findings: FindingItem[] = [];

  for (const signal of briefing.signals) {
    findings.push({
      id: `signal-${signal.id}`,
      kind: "signal",
      title: signal.title,
      description: signal.summary,
      date: signal.eventDate,
      status: signal.importance ?? null,
      source: null,
    });
  }

  for (const fact of briefing.validatedFacts) {
    findings.push({
      id: `fact-${fact.id}`,
      kind: "fact",
      title: fact.statement,
      evidence: fact.excerpt,
      date: fact.period,
      status: fact.modality,
      source: fact.sourceLabel,
    });
  }

  const risks: RiskItem[] = [];
  for (const opportunity of briefing.opportunities) {
    if (opportunity.uncertaintyStatement) {
      risks.push({ id: `unc-${opportunity.id}`, text: opportunity.uncertaintyStatement });
    }
  }
  for (const action of briefing.actions) {
    if (action.uncertaintyStatement) {
      risks.push({ id: `act-unc-${action.id}`, text: action.uncertaintyStatement });
    }
  }
  if (briefing.outcome === "facts_only" || briefing.outcome === "insufficient_evidence") {
    risks.push({ id: "outcome-gap", text: briefing.outcomeBody });
  }
  if (briefing.intelligence?.changeSummary && briefing.outcome === "analysis_partial") {
    risks.push({ id: "partial", text: "A pesquisa ficou parcial — valide os pontos abaixo com o cliente antes de usar como conclusão." });
  }

  const publicSources = sources.filter((source) => source.status !== "rejected" || Boolean(source.rejection_reason));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-14">
      <section id="resumo" className="scroll-mt-8">
        <h2 className="text-lg font-semibold tracking-tight">{ui.companyReport.summary}</h2>
        <p className="mt-3 text-base leading-relaxed text-foreground">{briefing.outcomeTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{briefing.outcomeBody}</p>
        {briefing.meaningHeadline ? (
          <p className="mt-4 text-sm font-medium text-foreground">{briefing.meaningHeadline}</p>
        ) : null}
        {briefing.meaningSummary ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{briefing.meaningSummary}</p>
        ) : null}
        {briefing.reasons.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {briefing.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="achados" className="scroll-mt-8">
        <h2 className="text-lg font-semibold tracking-tight">{ui.companyReport.findings}</h2>
        {findings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{ui.companyReport.noFindings}</p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {findings.map((item) => (
              <li key={item.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{kindLabel(item.kind)}</span>
                  {item.status ? <span className="text-xs text-muted-foreground">· {item.status}</span> : null}
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">{item.title}</p>
                {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                {item.evidence ? (
                  <p className="mt-2 text-xs text-muted-foreground italic">&ldquo;{item.evidence}&rdquo;</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {[item.date, item.source].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="oportunidades" className="scroll-mt-8">
        <h2 className="text-lg font-semibold tracking-tight">{ui.companyReport.opportunities}</h2>
        {briefing.opportunities.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{ui.companyReport.noOpportunities}</p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {briefing.opportunities.map((opportunity) => {
              const relatedAction = briefing.actions.find((action) => action.companyId === opportunity.companyId);
              return (
                <li key={opportunity.id} className="py-4">
                  <p className="text-sm font-medium">{opportunity.title}</p>
                  {opportunity.summary ? <p className="mt-1 text-sm text-muted-foreground">{opportunity.summary}</p> : null}
                  {opportunity.triggerSignalTitle ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Por que apareceu: {opportunity.triggerSignalTitle}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[
                      opportunity.primaryCapability ? `Aderência EFESO: ${opportunity.primaryCapability}` : null,
                      opportunity.uncertaintyStatement ? `Incerteza: ${opportunity.uncertaintyStatement}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {relatedAction?.title ? (
                    <p className="mt-2 text-xs font-medium text-foreground">Possível próximo passo: {relatedAction.title}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="riscos" className="scroll-mt-8">
        <h2 className="text-lg font-semibold tracking-tight">{ui.companyReport.risks}</h2>
        {risks.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{ui.companyReport.noRisks}</p>
        ) : (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {risks.map((risk) => (
              <li key={risk.id}>{risk.text}</li>
            ))}
          </ul>
        )}
      </section>

      <section id="fontes" className="scroll-mt-8">
        <h2 className="text-lg font-semibold tracking-tight">{ui.companyReport.sources}</h2>
        {publicSources.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma fonte pública persistida nesta pesquisa.</p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {publicSources.map((source) => (
              <li key={source.id} className="py-3">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {source.title || source.publisher}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    source.publisher,
                    source.published_at ? formatDate(source.published_at) : null,
                    source.source_type.replaceAll("_", " "),
                    source.status === "rejected"
                      ? `Descartada${source.rejection_reason ? ` — ${source.rejection_reason}` : ""}`
                      : "Retida",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 1 ? (
        <section id="historico" className="scroll-mt-8">
          <h2 className="text-lg font-semibold tracking-tight">{ui.companyReport.history}</h2>
          <ul className="mt-4 divide-y border-y text-sm">
            {history.map((run) => (
              <li key={run.id} className="flex flex-wrap justify-between gap-2 py-3">
                <span>{formatDate(run.created_at)}</span>
                <span className="text-muted-foreground">
                  {run.status} · {run.accepted_source_count} fontes ·{" "}
                  <Link href={routes.research(run.id)} className="underline-offset-4 hover:underline">
                    abrir
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="sr-only">{slug}</p>
    </div>
  );
}
