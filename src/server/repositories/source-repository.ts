import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SourceRow } from "@/types/database";

export async function findSourceByCanonicalUrl(
  workspaceId: string,
  canonicalUrl: string,
): Promise<SourceRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("canonical_url", canonicalUrl)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSourceById(workspaceId: string, sourceId: string): Promise<SourceRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSourcesByIds(workspaceId: string, sourceIds: string[]): Promise<SourceRow[]> {
  if (sourceIds.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("id", sourceIds);
  if (error) throw error;
  return data ?? [];
}

export async function createSource(input: {
  workspaceId: string;
  canonicalUrl?: string | null;
  domain?: string | null;
  publisherName: string;
  sourceType: SourceRow["source_type"];
  sourceTier: SourceRow["source_tier"];
  isPrimarySource?: boolean;
  languageCode?: string | null;
  countryCode?: string | null;
  accessType?: SourceRow["access_type"];
}): Promise<SourceRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sources")
    .insert({
      workspace_id: input.workspaceId,
      canonical_url: input.canonicalUrl ?? null,
      domain: input.domain ?? null,
      publisher_name: input.publisherName,
      source_type: input.sourceType,
      source_tier: input.sourceTier,
      is_primary_source: input.isPrimarySource ?? false,
      language_code: input.languageCode ?? null,
      country_code: input.countryCode ?? null,
      access_type: input.accessType ?? "public",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function touchSourceLastSeen(workspaceId: string, sourceId: string): Promise<SourceRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sources")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", sourceId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
