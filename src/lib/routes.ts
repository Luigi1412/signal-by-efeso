/** Centralized route builders so links never drift from the file-system routes. */

export const routes = {
  login: "/login",
  home: "/",
  companies: "/companies",
  newAnalysis: "/analysis/new",
  knowledgeBase: "/knowledge-base",
  admin: "/admin",
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
  companyTab: (slug: string, tab: WorkspaceTabId) =>
    tab === "overview" ? `/companies/${slug}` : `/companies/${slug}/${tab}`,
} as const;

export const workspaceTabs = ["overview", "signals", "opportunities", "evidence", "report", "versions"] as const;

export type WorkspaceTabId = (typeof workspaceTabs)[number];

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
