import type {
  Analysis,
  AnalysisVersion,
  ResearchLiveSummary,
  ResearchPhase,
} from "@/types";

/** Demo data — synthetic and not validated. Report-locale content (pt-BR). */
export const analyses: Analysis[] = [
  {
    id: "an-natura-v1",
    companyId: "co-natura",
    version: "1.2",
    status: "ready",
    focus: "General EFESO opportunity scan",
    geography: "Brazil",
    updatedAt: "2026-10-14T11:00:00-03:00",
    updatedAtLabel: "14 out. 2026",
    executiveSignal: {
      known: "A Natura entra em um ciclo de expansão industrial no Brasil enquanto o grupo persegue uma agenda explícita de melhoria de margem. A informação pública confirma um novo investimento no complexo de Cajamar, uma expansão planejada de capacidade e o aumento de contratações industriais na região.",
      meaning:
        "Ao mesmo tempo, o estoque consolidado cresceu três vezes mais rápido que a receita em 2025, e o mercado brasileiro de beleza deve desacelerar em 2026. A evidência indica que disciplina de ramp-up, planejamento e transparência de custos devem estar na agenda operacional nos próximos 12–24 meses.",
      toValidate:
        "O Signal identificou duas oportunidades de força alta (Ramp-up e produtividade industrial; Capital de giro e planejamento), uma de força moderada (Competitividade de custos) e uma área de força baixa, com evidência pública insuficiente (Operações digitais). A capacidade instalada atual não pôde ser determinada com segurança e foi excluída da modelagem quantitativa.",
    },
    whyNow: [
      {
        id: "wn-01",
        title: "Novo investimento industrial",
        detail: "Expansão do complexo industrial de Cajamar anunciada; obras em 2026–2027.",
        type: "verified",
        periodLabel: "mar. 2026",
      },
      {
        id: "wn-02",
        title: "Programa de melhoria de margem",
        detail: "Iniciativa plurianual de margem e SG&A, com a América Latina como prioridade.",
        type: "verified",
        periodLabel: "jan. 2026",
      },
      {
        id: "wn-03",
        title: "Crescimento de estoque",
        detail: "Estoque +18% a/a contra receita +6% em 2025.",
        type: "derived",
        periodLabel: "dez. 2025",
      },
      {
        id: "wn-04",
        title: "Agenda de transformação da liderança",
        detail: "Chief Transformation Officer nomeado com mandato de operações e custo.",
        type: "verified",
        periodLabel: "nov. 2025",
      },
    ],
    brazilFootprint: [
      { id: "fp-01", value: "5", label: "unidades industriais", type: "verified" },
      { id: "fp-02", value: "2", label: "centros de distribuição", type: "conflict" },
      { id: "fp-03", value: "4.300", label: "colaboradores", type: "verified" },
    ],
    health: {
      evidenceQuality: "Strong",
      primarySourceCoverage: 81,
      conflicts: 2,
      insufficientDataAreas: 3,
      insufficientDataTopics: [
        "OEE atual e curva de ramp-up",
        "Ponte de margem específica do Brasil",
        "Roadmap digital de manufatura",
      ],
    },
  },
];

export const analysisVersions: AnalysisVersion[] = [
  {
    id: "ver-natura-12",
    companyId: "co-natura",
    version: "v1.2",
    isCurrent: true,
    dateLabel: "14 out. 2026",
    date: "2026-10-14T15:40:00-03:00",
    author: "Mariana Costa",
    summary: "Análise refinada com foco em produtividade industrial.",
    changes: [
      { id: "chg-01", text: "4 novos achados" },
      { id: "chg-02", text: "Deep dive de manufatura adicionado" },
      { id: "chg-03", text: "Oportunidade digital removida" },
      { id: "chg-04", text: "1 conflito resolvido" },
    ],
  },
  {
    id: "ver-natura-11",
    companyId: "co-natura",
    version: "v1.1",
    isCurrent: false,
    dateLabel: "14 out. 2026",
    date: "2026-10-14T11:00:00-03:00",
    author: "Mariana Costa",
    summary: "Investigação de supply chain adicionada.",
    changes: [{ id: "chg-05", text: "Investigação de supply chain adicionada" }],
  },
  {
    id: "ver-natura-10",
    companyId: "co-natura",
    version: "v1.0",
    isCurrent: false,
    dateLabel: "13 out. 2026",
    date: "2026-10-13T17:12:00-03:00",
    author: "Signal",
    summary: "Análise inicial.",
    changes: [{ id: "chg-06", text: "Análise inicial" }],
  },
];

export const researchPhases: ResearchPhase[] = [
  { id: "ph-01", label: "Empresa confirmada", detail: "Natura Cosméticos S.A. · Brasil", durationMs: 700 },
  { id: "ph-02", label: "Fontes corporativas identificadas", detail: "Relações com investidores, documentos regulatórios, imprensa", durationMs: 1300 },
  { id: "ph-03", label: "Relatórios anuais analisados", detail: "2023 – 2025", durationMs: 1600 },
  { id: "ph-04", label: "Operações no Brasil mapeadas", detail: "Unidades, distribuição e quadro de pessoal", durationMs: 1400 },
  { id: "ph-05", label: "Prioridades estratégicas extraídas", detail: "Teleconferências e apresentações a investidores", durationMs: 1300 },
  { id: "ph-06", label: "Sinais recentes revisados", detail: "Últimos 24 meses", durationMs: 1200 },
  { id: "ph-07", label: "Indicadores financeiros analisados", detail: "Estoque, margem e tendência de receita", durationMs: 1400 },
  { id: "ph-08", label: "Investigando sinais operacionais", detail: "Capacidade, contratações e investimento", durationMs: 1500 },
  { id: "ph-09", label: "Mapeando oportunidades EFESO", detail: "Contra as capacidades da EFESO Brasil", durationMs: 1400 },
  { id: "ph-10", label: "Questionando hipóteses", detail: "Contraevidência e explicações alternativas", durationMs: 1300 },
  { id: "ph-11", label: "Rodando checagens de qualidade", detail: "Conflitos de fonte e calibração de confiança", durationMs: 1100 },
];

export const researchFinalSummary: ResearchLiveSummary = {
  sourcesDiscovered: 84,
  sourcesRetained: 37,
  verifiedClaims: 29,
  emergingOpportunities: 4,
  potentialConflicts: 1,
};
