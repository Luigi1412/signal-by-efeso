import { notFound } from "next/navigation";
import { getAnalysisForCompany, getCompanies, getCompanyBySlug } from "@/data";
import type { Analysis, Company } from "@/types";

export interface WorkspaceContext {
  company: Company;
  analysis: Analysis | undefined;
}

/** Shared resolver for all workspace tab pages. */
export function resolveWorkspace(slug: string): WorkspaceContext {
  const company = getCompanyBySlug(slug);
  if (!company) notFound();
  return { company, analysis: getAnalysisForCompany(company.id) };
}

export function workspaceStaticParams() {
  return getCompanies().map((c) => ({ slug: c.slug }));
}
