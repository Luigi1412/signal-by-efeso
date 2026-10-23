/** Fictional, memory-only UI fixtures. Never import into services, workers or persistence. */
import type { Company, CurrentUser } from "@/types";
import type { CompanyBriefing, ValidatedFactView } from "@/server/services/company-briefing-service";
import type { CompanyHistoryRow } from "@/server/services/companies-history-service";
import type { ExternalResearchRunRow, ExternalSourceCandidateRow, ExternalResearchStatus } from "@/server/external-research/types";
import type { PreviewResearchResult, ResearchView } from "@/server/actions/external-research-actions";
import type { PreviewActions } from "./runtime";
import { researchOutcomeMemberCopy } from "@/server/product/research-outcome";

const DATE = "2026-10-01T12:00:00.000Z";
export const previewUser: CurrentUser = { name: "Pessoa de revisão · PREVIEW LOCAL", role: "Perfil ilustrativo", organization: "PREVIEW LOCAL", initials: "PL" };
export const scenarioSlugs = ["horizonte-industrial", "verde-papel", "oficina-delta"] as const;
export type ScenarioSlug = (typeof scenarioSlugs)[number];

function source(id: string, title: string, sourceType: ExternalSourceCandidateRow["source_type"], status: ExternalSourceCandidateRow["status"] = "fetched"): ExternalSourceCandidateRow {
  return { id: `preview-local-${id}`, workspace_id: "preview-local-workspace", research_run_id: "preview-local-run", url: `/preview/sources/${id}`, normalized_url: `/preview/sources/${id}`, title: `${title} · PREVIEW LOCAL`, publisher: "Documento fictício · PREVIEW LOCAL", source_type: sourceType, source_tier: status === "rejected" ? 4 : 1, source_quality: status === "rejected" ? "weak" : "primary", published_at: "2026-10-01", discovered_at: DATE, status, rejection_reason: status === "rejected" ? "weak_source" : null, canonical_url: null, content_hash: null, source_id: `preview-local-source-${id}`, snapshot_id: status === "fetched" ? `preview-local-snapshot-${id}` : null, created_at: DATE };
}

export const previewSources = [
  source("expansao", "Comunicado de expansão industrial", "press_release"),
  source("resultados", "Apresentação de resultados financeiros", "earnings_release"),
  source("relatorio", "Relatório anual e prioridades operacionais", "annual_report"),
  source("fragil", "Página sem evidência suficiente", "other", "rejected"),
];
export const previewExcerpts: Record<string, string> = {
  expansao: "[FIXTURE — PREVIEW LOCAL] A Horizonte Industrial anuncia uma nova unidade no Brasil, com investimento planejado de R$ 180 milhões. A instalação deverá acrescentar capacidade de 250 mil unidades anuais a partir de 2027. O cronograma está sujeito às etapas de implantação.",
  resultados: "[FIXTURE — PREVIEW LOCAL] No primeiro semestre de 2026, a receita líquida foi de R$ 1,2 bilhão. O EBITDA ajustado foi de R$ 144 milhões. Os valores são consolidados em reais. Não se informa a performance de cada instalação.",
  relatorio: "[FIXTURE — PREVIEW LOCAL] O plano industrial prevê integrar a nova unidade à cadeia de fornecedores e preparar o ramp-up por etapas. O documento não divulga o desenho da equipe de implantação, os gargalos ou a disponibilidade de suporte externo.",
  fragil: "[FIXTURE — PREVIEW LOCAL] Uma página de diretório apenas menciona a empresa. Não há data de publicação verificável, dados de operação ou documentação primária suficiente.",
};

function fact(id: string, statement: string, sourceId: string, metric: string | null = null, unit: string | null = null, currency: string | null = null): ValidatedFactView {
  return { id: `preview-local-fact-${id}`, statement, period: "2026 · cenário fictício", modality: "Sustentado no cenário ilustrativo", sourceLabel: `Documento fictício: ${sourceId}`, sourceUrl: `/preview/sources/${sourceId}`, sourceDate: "2026-10-01", metric, unit, currency, confidence: 0.92, excerpt: previewExcerpts[sourceId] };
}
const expansionFacts = [
  fact("unidade", "A empresa anunciou uma nova unidade industrial no Brasil, com entrada planejada para 2027.", "expansao"),
  fact("capex", "O investimento planejado para a nova unidade é de R$ 180 milhões.", "expansao", "investimento_planejado", "BRL", "BRL"),
  fact("capacidade", "A instalação deverá acrescentar capacidade de 250 mil unidades por ano.", "expansao", "capacidade_anual_planejada", "unidades/ano"),
  fact("integracao", "O plano prevê integrar fornecedores e preparar o ramp-up por etapas; gargalos e equipe de implantação não foram divulgados.", "relatorio"),
];
const financialFacts = [
  fact("receita", "A receita líquida consolidada no primeiro semestre de 2026 foi de R$ 1,2 bilhão.", "resultados", "receita_liquida", "BRL", "BRL"),
  fact("ebitda", "O EBITDA ajustado consolidado no período foi de R$ 144 milhões.", "resultados", "ebitda_ajustado", "BRL", "BRL"),
];

export interface PreviewScenario {
  origin: "local_preview";
  company: Company;
  briefing: CompanyBriefing;
  sources: ExternalSourceCandidateRow[];
  run: ExternalResearchRunRow;
}
export function previewScenario(slug: ScenarioSlug): PreviewScenario {
  const signal = slug === "horizonte-industrial";
  const factsOnly = slug === "verde-papel";
  const name = signal ? "Horizonte Industrial" : factsOnly ? "Verde Papel" : "Oficina Delta";
  const outcome = signal ? "signal_found" : factsOnly ? "facts_only" : "insufficient_evidence";
  const copy = researchOutcomeMemberCopy(outcome);
  const company: Company = { id: `preview-local-${slug}`, slug, name: `${name} · PREVIEW LOCAL`, legalName: `${name} Fictícia S.A.`, industry: signal ? "Indústria" : factsOnly ? "Papel e celulose" : "Serviços industriais", country: "Brasil", headquarters: "Localização ilustrativa", website: `${slug}.invalid`, brazilRelevance: "high", description: "Empresa fictícia, exclusivamente para revisão visual local." };
  const sources = signal ? previewSources.slice(0, 3) : factsOnly ? [previewSources[1]!] : [previewSources[3]!];
  const movement = { id: "preview-local-movement", companyId: company.id, companyName: company.name, companySlug: slug, signalType: "new_facility", signalNature: "event", title: "Expansão industrial com preparação de ramp-up", summary: "A nova unidade adiciona capacidade e exige preparação de operação e fornecedores. O início permanece planejado para 2027.", status: "active", importance: "high", confidenceTier: "high", assertionMode: "announced", eventDate: "2026-10-01", geography: "Brasil", evidenceCount: 3, demoOrigin: true, createdAt: DATE };
  const chain = { movement: movement.title, operationalImplication: "Coordenar a entrada de capacidade, a prontidão dos fornecedores e o aumento gradual de produção.", possibleNeed: "Possível necessidade de estruturar o plano de ramp-up e acompanhar a prontidão operacional.", fitRationale: "Neste cenário fictício, capacidades de Asset Productivity e ramp-up oferecem aderência à preparação industrial descrita.", uncertainty: "Não há informação sobre gargalos, apoio já contratado ou intenção de contratação.", clientValidation: "Validar metas, cronograma, responsáveis, gargalos e iniciativas internas antes de discutir suporte.", signalIds: [movement.id] };
  const fit = { id: "preview-local-fit", companyId: company.id, companyName: company.name, companySlug: slug, knowledgeObjectId: "preview-local-capability", knowledgeName: "Asset Productivity / Ramp-up · PREVIEW LOCAL", knowledgeType: "capability", status: "active", fitLevel: "high", fitScore: null, fitReasonSummary: chain.fitRationale, version: 1, originModelRunId: null, demoOrigin: true, components: [], relatedSignals: [{ id: movement.id, title: movement.title, matchType: "operational_need", matchStrength: "high" }], relatedCases: [], relatedMethodologies: [], relatedProblems: [], relatedCapabilities: [], relatedIndustries: [], relatedResults: [], operationalChain: chain };
  const opportunity = { id: "preview-local-opportunity", companyId: company.id, companyName: company.name, companySlug: slug, title: "Hipótese de apoio à preparação do ramp-up", summary: "A expansão descrita no cenário pode justificar uma conversa exploratória sobre prontidão operacional. Não representa demanda confirmada nem recomendação comercial real.", status: "active", opportunityType: "ramp_up", maturity: "hypothesis", relevanceLevel: "high", urgencyLevel: "medium", confidenceTier: "medium", assertionMode: "hypothesis", geography: "Brasil", primaryCapability: "Asset Productivity / Ramp-up · exemplo ilustrativo", triggerSignalTitle: movement.title, triggerSignalId: movement.id, uncertaintyStatement: chain.uncertainty, demoOrigin: true, createdAt: DATE, updatedAt: DATE, operationalImplication: chain.operationalImplication, potentialNeed: chain.possibleNeed, clientValidation: chain.clientValidation, nextStep: "Conversa exploratória para entender o plano de implantação e verificar se existe lacuna de suporte." };
  const briefing: CompanyBriefing = {
    companyId: company.id, outcome, outcomeTitle: copy.title, outcomeBody: copy.body, executionStatus: "completed", queriedName: name, canonicalName: company.name, corporateCountry: "Brasil", researchGeography: "Brasil", validatedFacts: signal ? [...expansionFacts, ...financialFacts] : factsOnly ? financialFacts : [], movements: signal ? [{ id: movement.id, title: movement.title, eventDate: movement.eventDate }] : [],
    meaningHeadline: signal ? "A expansão desloca o foco do anúncio para a prontidão da operação." : null,
    meaningSummary: signal ? "No cenário ilustrativo, a combinação de nova unidade, capacidade adicional e integração de fornecedores sugere complexidade de implantação. A necessidade de apoio externo permanece uma hipótese, não um fato." : null,
    themes: signal ? ["Capacidade", "Ramp-up", "Cadeia de fornecedores", "Investimento"] : [], topFit: signal ? { id: fit.id, name: fit.knowledgeName, level: fit.fitLevel, reason: fit.fitReasonSummary } : null, topOpportunity: signal ? opportunity : null, relationship: null, nextAction: null, opportunities: signal ? [opportunity] : [], actions: [],
    reasons: [signal ? "O cenário reúne anúncio de investimento, capacidade planejada e preparação da cadeia de fornecedores. As citações fictícias abaixo sustentam apenas esta demonstração visual." : factsOnly ? "O cenário apresenta indicadores financeiros definidos e rastreáveis, mas não estabelece movimento operacional material suficiente para signal ou oportunidade." : "As páginas ilustrativas disponíveis não permitem confirmar movimentos recentes ou sustentar uma conclusão confiável."],
    intelligence: null, fits: signal ? [fit] : [], signals: signal ? [movement] : [], sourceCount: signal ? 3 : factsOnly ? 1 : 0, primarySourceCount: signal ? 3 : factsOnly ? 1 : 0,
    fitNearMisses: [], actionCandidates: [], workingHypotheses: [], suggestedNextSteps: [], reportRisks: signal ? [{ id: "preview-local-risk", text: "Hipótese: atrasos na integração de fornecedores poderiam afetar o ramp-up; esse risco não foi confirmado.", severity: "medium", kind: "hypothesis" }] : [],
    researchLimitations: [{ id: "preview-local-limit", text: signal ? "Todos os fatos, documentos, métricas e aderências desta página são fictícios. Não houve pesquisa nem consulta ao Knowledge Pack EFESO real." : factsOnly ? "Os fatos financeiros do cenário não demonstram mudança operacional; não se força signal, Fit ou oportunidade." : "Sem fonte primária densa, data verificável e evidência material suficiente. Nenhum signal ou oportunidade é proposto.", severity: "medium", kind: "research_limitation" }], commercialGapNote: null, efesoFitState: signal ? "FIT_FOUND" : "FIT_NOT_EVALUATED", efesoFitMessage: signal ? "Aderência ilustrativa fundamentada na cadeia fictícia de evidência abaixo. Nenhum conteúdo privado EFESO foi consultado." : "Fit não avaliado neste cenário, por ausência de movimento qualificado.", publishFullReport: signal || factsOnly, phaseTimings: [],
  };
  const run: ExternalResearchRunRow = { id: `preview-local-${slug}`, workspace_id: "preview-local-workspace", requested_query: name, normalized_query: name.toLowerCase(), requested_country: "BR", requested_industry: company.industry, time_horizon_months: 24, resolved_company_id: company.id, analysis_id: "preview-local-analysis", research_run_id: "preview-local-legacy", status: "completed", started_at: DATE, completed_at: DATE, failure_reason: null, failure_code: null, source_count: sources.length, accepted_source_count: briefing.sourceCount, rejected_source_count: signal || factsOnly ? 0 : 1, unavailable_source_count: 0, resolution_payload: { origin: "local_preview" }, created_by: null, created_at: DATE, updated_at: DATE };
  return { origin: "local_preview", company, briefing, sources, run };
}

export function previewCompanyHistory(): CompanyHistoryRow[] {
  return scenarioSlugs.map(slug => {
    const { company, briefing, run } = previewScenario(slug);
    return { companyId: company.id, slug, name: company.name, industry: company.industry, country: "Brasil", domain: company.website, lastResearchedAt: DATE, updatedAt: DATE, outcome: briefing.outcome, outcomeLabel: briefing.outcomeTitle, runStatus: run.status, signalCount: briefing.signals.length, opportunityCount: briefing.opportunities.length, demoOnly: true };
  });
}

export const previewCandidates = [
  { name: "Atlas Indústria · PREVIEW LOCAL", country: "Brasil", industry: "Indústria", domain: "atlas-industria.invalid" },
  { name: "Atlas Serviços · PREVIEW LOCAL", country: "Portugal", industry: "Serviços", domain: "atlas-servicos.invalid" },
];

export function createPreviewSession(slug: ScenarioSlug = "horizonte-industrial", phase: ExternalResearchStatus = "extracting_claims") {
  const scenario = previewScenario(slug);
  const makeView = (status: ExternalResearchStatus): ResearchView => {
    const early = ["queued", "resolving_entity", "needs_user_resolution"].includes(status);
    const hasClaims = ["extracting_claims", "generating_signals", "generating_intelligence", "generating_opportunities", "generating_actions", "completed"].includes(status);
    const done = status === "completed";
    return { id: scenario.run.id, status, query: scenario.company.name, failureReason: status === "failed" ? "Falha ilustrativa de acesso a uma fonte. Nenhum serviço externo foi consultado." : null, failureCode: status === "failed" ? "SOURCE_FETCH_FAILED" : null, sourceCount: early ? 0 : scenario.sources.length, acceptedCount: early ? 0 : scenario.briefing.sourceCount, rejectedCount: early ? 0 : scenario.run.rejected_source_count, unavailableCount: 0, companySlug: slug, analysisId: null, counts: { claims: hasClaims ? scenario.briefing.validatedFacts.length : 0, signals: done ? scenario.briefing.signals.length : 0, opportunities: done ? scenario.briefing.opportunities.length : 0 }, memberProgress: "PREVIEW LOCAL — fase selecionada manualmente, sem pesquisa em execução.", initialAnalysisAvailable: hasClaims, enrichmentInProgress: false, candidates: status === "needs_user_resolution" ? previewCandidates : [], outcome: done ? scenario.briefing.outcome : null, sources: early ? [] : scenario.sources.map(s => ({ id: s.id, title: s.title, publisher: s.publisher, url: s.url, publishedAt: s.published_at, sourceType: s.source_type, quality: s.source_quality, status: s.status, rejectionReason: s.rejection_reason })) };
  };
  let current = makeView(phase);
  const identify: PreviewActions["identify"] = async raw => {
    const input = raw as { query?: string };
    const query = input.query?.toLowerCase() ?? "";
    if (query.includes("atlas")) return { ok: true, kind: "ambiguous", candidates: previewCandidates };
    if (query.includes("horizonte")) return { ok: true, kind: "existing", slug, name: scenario.company.name, country: "Brasil", industry: "Indústria", domain: "horizonte-industrial.invalid" };
    if (query.includes("orion")) return { ok: true, kind: "resolved", name: "Orion Industrial · PREVIEW LOCAL", country: "Brasil", industry: "Indústria", domain: "orion-industrial.invalid" };
    return { ok: true, kind: "unresolved", suggestions: [] } satisfies PreviewResearchResult;
  };
  const actions: PreviewActions = {
    identify,
    start: async raw => { const input = raw as { existingSlug?: string }; const target = scenarioSlugs.find(s => s === input.existingSlug) ?? slug; return { ok: true, runId: `preview-local-${target}` }; },
    tick: async () => ({ ok: true, run: current }),
    cancel: async () => { current = makeView("cancelled"); return { ok: true }; },
    resolve: async () => { current = makeView("discovering_sources"); return { ok: true, runId: current.id }; },
  };
  return { actions, initial: current, setPhase: (status: ExternalResearchStatus) => { current = makeView(status); return current; } };
}
