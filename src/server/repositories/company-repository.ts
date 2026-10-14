import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/database";

export async function getCompaniesForWorkspace(workspaceId: string): Promise<CompanyRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCompanyBySlug(workspaceId: string, slug: string): Promise<CompanyRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCompanyById(workspaceId: string, companyId: string): Promise<CompanyRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", companyId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function resolveCompany(workspaceId: string, query: string): Promise<CompanyRow | null> {
  const q = query.trim();
  if (!q) return null;

  const companies = await getCompaniesForWorkspace(workspaceId);
  const needle = q.toLowerCase();

  return (
    companies.find(
      (c) =>
        c.slug === needle ||
        c.display_name.toLowerCase() === needle ||
        c.display_name.toLowerCase().includes(needle) ||
        (c.primary_domain && c.primary_domain.toLowerCase().includes(needle)),
    ) ?? null
  );
}
