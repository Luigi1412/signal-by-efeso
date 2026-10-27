"use client";

import { ScopedLink as Link, useLocalPreview } from "@/components/local-preview/runtime";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { WorkspaceActions } from "./workspace-actions";
import { formatDate } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { CompanyBriefing, ValidatedFactView } from "@/server/services/company-briefing-service";
import type { ExternalResearchRunRow, ExternalSourceCandidateRow } from "@/server/external-research/types";
import styles from "./company-report.module.css";

interface CompanyReportProps {
  slug: string;
  briefing: CompanyBriefing;
  sources: ExternalSourceCandidateRow[];
  history: ExternalResearchRunRow[];
  demoMode?: boolean;
  signalFactIds?: Record<string, string[]>;
}

const sourceTypes: Record<string, string> = { official_page: "Página oficial", press_release: "Comunicado", annual_report: "Relatório anual", sustainability_report: "Sustentabilidade", earnings_release: "Resultados financeiros", filing: "Documento regulatório", regulator: "Órgão regulador", news: "Notícia", other: "Outra fonte" };
const qualities: Record<string, string> = { primary: "Primária", authoritative_secondary: "Secundária de referência", secondary: "Secundária", weak: "Limitada" };
const retained = new Set(["accepted", "fetched", "ingested", "processed"]);

/** Presentation only: outcome, facts, signals and Fit are supplied by the existing assessment. */
export function CompanyReport({ slug, briefing: b, sources, history, demoMode = false, signalFactIds = {} }: CompanyReportProps) {
  const preview = useLocalPreview();
  const insufficient = b.outcome === "insufficient_evidence";
  const compact = insufficient || !b.publishFullReport;
  const factsOnly = b.outcome === "facts_only";
  const full = b.publishFullReport && !insufficient;
  const material = b.outcome === "signal_found" && full;
  const accepted = sources.filter(s => s.status !== "rejected" && (retained.has(s.status) || s.snapshot_id));
  const discarded = sources.filter(s => s.status === "rejected");
  const headline = insufficient ? "Evidência pública insuficiente" : material ? b.signals[0]?.title ?? b.outcomeTitle : factsOnly ? "Encontramos fatos relevantes, mas nenhum movimento material foi confirmado." : b.outcomeTitle;
  const summary = material ? b.signals[0]?.summary || b.reasons[0] || b.outcomeBody : b.reasons[0] || b.outcomeBody;
  const limitations = [...new Set(b.researchLimitations.map(l => l.text))].filter(text => text !== summary && text !== b.outcomeBody);
  const hasMeaning = material && (b.meaningHeadline || b.meaningSummary || b.workingHypotheses.length > 0);

  const fitChain = b.topFit ? b.fits.find(f => f.id === b.topFit?.id)?.operationalChain : null;
  const focusFacts = material ? b.validatedFacts.filter(f => f.metric).slice(0, 2) : [];
  const timingFact = material ? b.validatedFacts.find(f => !f.metric) : null;

  return <article className={styles.report} aria-label="Inteligência da empresa">
    <header id="report-resumo" className={material ? `${styles.lead} ${styles.materialLead}` : styles.lead}>
      <div>
      <p className="hidden text-xl font-medium print:block">{b.canonicalName}</p>
      <p className="eyebrow text-brand">{material ? "Movimento identificado" : compact ? "Limites da pesquisa" : factsOnly ? "Somente fatos" : b.outcomeTitle}</p>
      <h2 className={styles.headline}>{headline}</h2>
      <p className={styles.summary}>{summary}</p>
      {!compact && <p className={styles.counts}>
        {material && <span>{b.signals.length} {b.signals.length === 1 ? "movimento" : "movimentos"}</span>}
        <span>{b.validatedFacts.length} {b.validatedFacts.length === 1 ? "fato validado" : "fatos validados"}</span>
        {b.primarySourceCount > 0 && <span>{b.primarySourceCount} {b.primarySourceCount === 1 ? "fonte primária" : "fontes primárias"}</span>}
        <a href={material ? "#report-evidencias" : "#report-movimentos"} onClick={material ? () => { const evidence = document.getElementById("report-evidencias"); if (evidence instanceof HTMLDetailsElement) evidence.open = true; } : undefined}>Ver evidências <ArrowDown size={13} aria-hidden /></a>
      </p>}
      </div>
      {material && focusFacts.length > 0 && <aside className={styles.focusFacts} aria-label="Fatos em destaque"><p className="eyebrow">Em foco</p>{[...focusFacts, ...(timingFact ? [timingFact] : [])].map(f => <div key={f.id}><p>{f.statement}</p><a href="#report-evidencias" onClick={() => { const evidence = document.getElementById("report-evidencias"); if (evidence instanceof HTMLDetailsElement) evidence.open = true; }}>Consultar evidência <ArrowDown size={11} aria-hidden /></a></div>)}</aside>}
    </header>

    {compact ? <>
      {b.validatedFacts.length > 0 && <Section title="O que conseguimos confirmar"><FactList facts={b.validatedFacts} sources={sources} /></Section>}
      <Section title="O que faltou">
        <CopyList items={limitations.length ? limitations : [b.outcomeBody]} />
        <div className="mt-6"><WorkspaceActions companySlug={slug} companyName={b.canonicalName ?? undefined} updateOnly /></div>
      </Section>
    </> : <>
      {hasMeaning && <Section id="report-leitura" title="Por que isso importa">
        {b.meaningHeadline && <p className={styles.emphasis}>{b.meaningHeadline}</p>}
        {b.meaningSummary && <p>{b.meaningSummary}</p>}
        {b.workingHypotheses.map(h => <div key={h.id} className="mt-4"><p className="eyebrow">Hipótese operacional</p><h3>{h.title}</h3><p>{h.summary}</p><p className={styles.note}>{h.confidenceNote}</p></div>)}
        <CopyList items={b.reportRisks.filter(r => r.kind === "company" || r.kind === "hypothesis").map(r => r.text)} className={styles.note} />
      </Section>}

      <Section id="report-movimentos" title={material ? "Movimentos relevantes" : "O que os documentos confirmam"}>
        {material && b.signals.length > 0 && <div className={styles.movements}>{b.signals.map((signal, index) => <div key={signal.id} className={styles.movement}>
          <span className={styles.index} aria-hidden>{String(index + 1).padStart(2, "0")}</span>
          <div><h3>{signal.title}</h3>{signal.summary !== summary && <p>{signal.summary}</p>}
            <p className={styles.note}>{[signal.eventDate ? formatDate(signal.eventDate) : null, signal.geography].filter(Boolean).join(" · ")}</p>
            {signalFactIds[signal.id]?.some(id => b.validatedFacts.some(f => f.id === id)) ? <details className={styles.disclosure}>
              <summary>{b.validatedFacts.filter(f => signalFactIds[signal.id]?.includes(f.id)).length} evidências deste movimento</summary>
              <FactList facts={b.validatedFacts.filter(f => signalFactIds[signal.id]?.includes(f.id))} sources={sources} />
            </details> : <a className={styles.evidenceLink} href="#report-evidencias" onClick={() => { const evidence = document.getElementById("report-evidencias"); if (evidence instanceof HTMLDetailsElement) evidence.open = true; }}>Consultar evidências da pesquisa <ArrowDown size={13} aria-hidden /></a>}
          </div>
        </div>)}</div>}
        {!material && <FactList facts={b.validatedFacts} sources={sources} compact />}
        {material && b.validatedFacts.length > 0 && <Evidence facts={b.validatedFacts} sources={sources} />}
      </Section>

      {factsOnly && <Section title="Por que não há sinal">
        <p>{b.outcomeBody}</p>
        <CopyList items={limitations} className={styles.note} />
      </Section>}

      {material && b.topFit && <Section id="report-efeso" title="Possível aderência EFESO">
        {b.topFit ? <>
          <div className={styles.fitHeading}><h3>{b.topFit.name}</h3><span>Aderência {({ high: "alta", medium: "média", low: "baixa" } as Record<string, string>)[b.topFit.level] ?? "em avaliação"}</span></div>
          {fitChain ? <dl className={styles.fitChain}>
            {[["Implicação operacional", fitChain.operationalImplication], ["Possível necessidade", fitChain.possibleNeed], ["Capacidade EFESO", b.topFit.reason || b.efesoFitMessage]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl> : <p>{b.topFit.reason || b.efesoFitMessage}</p>}
        </> : <p>{b.efesoFitMessage}</p>}
      </Section>}

      {material && b.opportunities.length > 0 && <Section title={b.opportunities.length === 1 ? "Oportunidade a validar" : "Oportunidades a validar"}>
        {b.opportunities.map(o => <div key={o.id} className={styles.opportunity}>
          <p className={styles.hypothesisLabel}>Hipótese comercial · a confirmar com o cliente</p><h3>{o.title}</h3>
          <p>{o.potentialNeed || o.summary}</p>
          <dl className={styles.nextSteps}>
            {[["O que validar", o.clientValidation], ["Próximo passo", o.nextStep], ["Incerteza", o.uncertaintyStatement]].filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>)}
      </Section>}
    </>}

    <section id="report-fontes" className={styles.sources}>
      <details className={styles.sourceDisclosure}><summary>Fontes e limitações<span>{accepted.length > 0 ? `${accepted.length} documentos` : "Detalhes da cobertura"}</span></summary>
      {accepted.length > 0 && <>
        <p className={styles.note}>{accepted.length} {accepted.length === 1 ? "documento consultado" : "documentos consultados"} · {b.primarySourceCount} de origem primária</p>
        <ol className={styles.sourceList}>{accepted.map((s, i) => <li key={s.id}>
          <span aria-hidden>{String(i + 1).padStart(2, "0")}</span><div><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.publisher || s.url} <ArrowUpRight size={13} aria-hidden /></a>
          <p>{[s.publisher, s.published_at ? formatDate(s.published_at) : null, sourceTypes[s.source_type], s.source_quality && qualities[s.source_quality]].filter(Boolean).join(" · ")}</p></div>
        </li>)}</ol>
      </>}
      {material && <CopyList items={limitations} className={styles.note} />}
      {!material && !compact && <span id="report-evidencias" />}
      <details className={styles.disclosure}>
        <summary>Identidade e detalhes da pesquisa</summary>
        <dl className={styles.metadata}>
          {[["Entidade analisada", b.canonicalName], ["Consulta original", b.queriedName], ["Domicílio", b.corporateCountry], ["Escopo", b.researchGeography]].filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        {discarded.length > 0 && <details className={styles.disclosure}><summary>Fontes descartadas ({discarded.length})</summary>{discarded.map(s => <p key={s.id} className={styles.note}>{s.title || s.url}{s.rejection_reason ? ` · ${({ weak_source: "Fonte sem evidência suficiente", duplicate: "Fonte já consultada" } as Record<string,string>)[s.rejection_reason] ?? "Não retida nesta análise"}` : ""}</p>)}</details>}
      </details>
      </details>
      {history[0] && <Link href={routes.research(history[0].id)} className={styles.evidenceLink}>Ver detalhes da pesquisa <ArrowUpRight size={13} aria-hidden /></Link>}
    </section>
    <footer className={styles.footer}>{preview ? "PREVIEW LOCAL · Dados, fontes, métricas, Fits e oportunidades fictícios. Exclusivo para revisão visual; não valida pesquisa real." : demoMode ? "Demonstração · Dados ilustrativos" : "SIGNAL by EFESO · Uso interno · Análise baseada em fontes públicas."}<span className="sr-only">{slug}</span></footer>
  </article>;
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className={styles.section}><h2>{title}</h2><div>{children}</div></section>;
}
function CopyList({ items, className }: { items: string[]; className?: string }) {
  return items.length ? <div className={className}>{[...new Set(items)].map(text => <p key={text}>{text}</p>)}</div> : null;
}
function Evidence({ facts, sources }: { facts: ValidatedFactView[]; sources: ExternalSourceCandidateRow[] }) {
  return <details id="report-evidencias" className={styles.disclosure}><summary>Ver evidências · {facts.length} fatos validados</summary><FactList facts={facts} sources={sources} /></details>;
}
function FactList({ facts, sources, compact = false }: { facts: ValidatedFactView[]; sources: ExternalSourceCandidateRow[]; compact?: boolean }) {
  return <div className={styles.facts}>{facts.map(f => {
    const source = sources.find(s => s.url === f.sourceUrl || s.canonical_url === f.sourceUrl);
    return <div key={f.id} className={styles.fact}>
      <p className={compact ? styles.factStatement : undefined}>{f.statement}</p>
      <p className={styles.note}>{f.period} · {f.sourceLabel}</p>
      <details className={styles.disclosure}><summary>Ver evidência original</summary>
        {f.excerpt && <blockquote>{f.excerpt}</blockquote>}
        <dl className={styles.metadata}>{[["Fonte", source?.title || f.sourceLabel], ["Editor", source?.publisher], ["Publicação", f.sourceDate ? formatDate(f.sourceDate) : null], ["Tipo", source && sourceTypes[source.source_type]], ["Qualidade", source?.source_quality && qualities[source.source_quality]], ["Métrica", f.metric ? ({ investimento_planejado: "Investimento planejado", capacidade_anual_planejada: "Capacidade anual planejada", receita_liquida: "Receita líquida", ebitda_ajustado: "EBITDA ajustado" } as Record<string,string>)[f.metric] ?? f.metric.replaceAll("_", " ") : null], ["Unidade", f.unit], ["Moeda", f.currency], ["Período", f.period], ["Validação", f.modality], ["Confiança", f.confidence !== null ? `${Math.round(f.confidence * 100)}%` : null]].filter(([, v]) => Boolean(v)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {f.sourceUrl && <a className={styles.evidenceLink} href={f.sourceUrl} target="_blank" rel="noopener noreferrer">Abrir documento original <ArrowUpRight size={13} aria-hidden /></a>}
        {f.sourceUrl && <p className="break-all text-xs text-muted-foreground">{f.sourceUrl}</p>}
      </details>
    </div>;
  })}</div>;
}
