"use client";

import { ScopedLink as Link } from "@/components/local-preview/runtime";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { CompanyHistoryRow } from "@/server/services/companies-history-service";
import styles from "./companies-history.module.css";

const TERMINAL_RUN_STATUSES = new Set(["completed", "partial", "failed", "cancelled"]);

const outcomes: Partial<Record<NonNullable<CompanyHistoryRow["outcome"]>, { title: string; description: string }>> = {
  signal_found: { title: "Movimento identificado", description: "Mudança material sustentada por evidências." },
  facts_only: { title: "Fatos sem movimento material", description: "Contexto confirmado. Nenhum sinal qualificado." },
  insufficient_evidence: { title: "Evidência insuficiente", description: "As fontes disponíveis não sustentam uma conclusão." },
  research_coverage_insufficient: {
    title: "Cobertura de pesquisa insuficiente",
    description: "A cobertura documental oficial ficou aquém do necessário.",
  },
  analysis_failed: {
    title: "Pesquisa incompleta",
    description: "A execução foi interrompida antes de uma conclusão confiável.",
  },
  analysis_partial: {
    title: "Pesquisa concluída com ressalvas",
    description: "A execução terminou com avisos operacionais.",
  },
  no_reliable_sources: {
    title: "Sem fontes confiáveis",
    description: "Não encontramos fontes públicas suficientemente confiáveis.",
  },
};

const phaseCopy: Record<string, string> = {
  queued: "Na fila de execução.",
  resolving_entity: "Confirmando a identidade da empresa.",
  discovering_sources: "Descobrindo fontes públicas.",
  reviewing_sources: "Selecionando fontes relevantes.",
  ingesting_sources: "Capturando e indexando documentos.",
  extracting_claims: "Extraindo fatos das fontes retidas.",
  generating_signals: "Qualificando movimentos.",
  generating_intelligence: "Montando a leitura executiva.",
  generating_opportunities: "Avaliando oportunidades.",
  generating_actions: "Preparando ações recomendadas.",
};

function isInProgress(runStatus: string | null | undefined): boolean {
  return Boolean(runStatus && !TERMINAL_RUN_STATUSES.has(runStatus));
}

export function CompaniesHistory({ rows }: { rows: CompanyHistoryRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const needle = normalize(query.trim());
    return rows.filter((row) =>
      normalize([row.name, row.domain, row.industry, row.country].filter(Boolean).join(" ")).includes(needle),
    );
  }, [query, rows]);

  if (!rows.length)
    return (
      <div className={styles.empty}>
        <p className="eyebrow">Seu ponto de partida</p>
        <h2>Uma empresa. Uma visão mais clara.</h2>
        <p>Comece uma pesquisa para entender movimentos, implicações operacionais e possíveis aderências EFESO.</p>
        <Button asChild variant="brand">
          <Link href={routes.researchNew}>
            {ui.companies.emptyCta}
            <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    );

  return (
    <div className={styles.history}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={17} aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresa, setor ou país"
            aria-label={ui.companies.searchAria}
            className="h-11 border-0 bg-transparent pl-9 shadow-none"
          />
        </div>
        <p aria-live="polite">{t(ui.companies.showing, { shown: filtered.length })}</p>
      </div>
      <div className={styles.columns} aria-hidden>
        <span>Empresa</span>
        <span>Leitura do SIGNAL</span>
        <span>Última pesquisa</span>
        <span />
      </div>
      <ul className={styles.list} aria-label="Empresas analisadas">
        {filtered.map((row) => {
          const inProgress = isInProgress(row.runStatus);
          // Execution status wins over any intermediate epistemological assessment.
          const outcome = !inProgress && row.outcome ? outcomes[row.outcome] : undefined;
          const title = inProgress ? "Pesquisa em andamento" : (outcome?.title ?? row.outcomeLabel);
          const description = inProgress
            ? (phaseCopy[row.runStatus ?? ""] ?? "A pesquisa ainda está em execução.")
            : (row.primaryMovement ??
              (row.signalCount > 0
                ? `${row.signalCount} ${row.signalCount === 1 ? "movimento relevante" : "movimentos relevantes"}${
                    row.opportunityCount > 0
                      ? ` · ${row.opportunityCount} ${row.opportunityCount === 1 ? "oportunidade a validar" : "oportunidades a validar"}`
                      : ""
                  }`
                : outcome?.description));
          return (
            <li key={row.companyId}>
              <Link href={routes.company(row.slug)} className={styles.row}>
                <div className={styles.company}>
                  <span className={styles.monogram} aria-hidden>
                    {row.name.slice(0, 1)}
                  </span>
                  <div>
                    <h2>{row.name}</h2>
                    <p>{[row.industry, row.country].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                <div className={styles.result} data-material={!inProgress && row.outcome === "signal_found"}>
                  <h3>
                    <span aria-hidden />
                    {title}
                  </h3>
                  <p>{description}</p>
                  {!inProgress && row.primaryMovement && row.opportunityCount > 0 && (
                    <p>
                      {row.opportunityCount} {row.opportunityCount === 1 ? "oportunidade a validar" : "oportunidades a validar"}
                    </p>
                  )}
                </div>
                <div className={styles.date}>
                  <time dateTime={row.lastResearchedAt ?? undefined}>
                    {row.lastResearchedAt ? formatDate(row.lastResearchedAt) : "Ainda não pesquisada"}
                  </time>
                  {row.updatedAt && row.updatedAt.slice(0, 10) !== row.lastResearchedAt?.slice(0, 10) && (
                    <p className="mt-2 text-[10px]">Atualizada em {formatDate(row.updatedAt)}</p>
                  )}
                </div>
                <ArrowRight className={styles.arrow} size={18} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      {!filtered.length && (
        <div className={styles.empty}>
          <h2>Nenhuma empresa encontrada.</h2>
          <p>Tente outro nome, setor ou país.</p>
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpar busca
          </Button>
        </div>
      )}
      <p className={styles.footnote}>Cada conclusão respeita a força da evidência disponível.</p>
    </div>
  );
}
