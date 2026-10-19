/** Centralized route builders so links never drift from the file-system routes. */

export const routes = {
  login: "/login",
  accessRestricted: "/access-restricted",
  home: "/",
  companies: "/companies",
  radar: "/radar",
  expertise: "/expertise",
  newAnalysis: "/analysis/new",
  knowledgeBase: "/knowledge-base",
  efesoKnowledge: "/knowledge/efeso",
  signals: "/signals",
  accountIntelligence: "/accounts/intelligence",
  opportunities: "/opportunities",
  actions: "/actions",
  admin: "/admin",
  releaseHealth: "/admin/release-health",
  extractionLab: "/admin/extraction-lab",
  knowledgeLab: "/admin/knowledge-lab",
  signalLab: "/admin/signal-lab",
  accountIntelligenceLab: "/admin/account-intelligence-lab",
  efesoFitLab: "/admin/efeso-fit-lab",
  opportunityLab: "/admin/opportunity-lab",
  relationshipLab: "/admin/relationship-lab",
  actionLab: "/admin/action-lab",
  researchLab: "/admin/research-lab",
  research: (id: string) => `/research/${encodeURIComponent(id)}`,
  analysisResolve: (slug: string, analysisId?: string) =>
    analysisId
      ? `/analysis/${slug}/resolve?analysis=${encodeURIComponent(analysisId)}`
      : `/analysis/${slug}/resolve`,
  analysisResearch: (slug: string, ids?: { analysis?: string; run?: string }) => {
    const params = new URLSearchParams();
    if (ids?.analysis) params.set("analysis", ids.analysis);
    if (ids?.run) params.set("run", ids.run);
    const query = params.toString();
    return query ? `/analysis/${slug}/research?${query}` : `/analysis/${slug}/research`;
  },
  analysisUnavailable: "/analysis/unavailable",
  company: (slug: string, analysisId?: string) =>
    analysisId ? `/companies/${slug}?analysis=${encodeURIComponent(analysisId)}` : `/companies/${slug}`,
  companyTab: (slug: string, tab: WorkspaceTabId, analysisId?: string) => {
    const path = tab === "overview" ? `/companies/${slug}` : `/companies/${slug}/${tab}`;
    return analysisId ? `${path}?analysis=${encodeURIComponent(analysisId)}` : path;
  },
} as const;

/** Primary member tabs for company workspace (v1.0). Legacy routes remain for compatibility. */
export const workspaceTabs = [
  "overview",
  "opportunities",
  "actions",
  "evidence",
] as const;

/** Legacy member tabs kept for deep links / redirects — not shown in primary nav. */
export const legacyWorkspaceTabs = ["signals", "intelligence", "report", "versions"] as const;

export const companyWorkspaceRoutes = [
  ...workspaceTabs,
  ...legacyWorkspaceTabs,
] as const;

export type WorkspaceTabId = (typeof companyWorkspaceRoutes)[number];

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
