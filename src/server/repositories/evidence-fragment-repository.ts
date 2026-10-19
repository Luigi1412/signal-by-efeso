import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EvidenceFragmentRow, Json } from "@/types/database";

export async function createEvidenceFragment(input: {
  workspaceId: string;
  sourceSnapshotId: string;
  fragmentType: EvidenceFragmentRow["fragment_type"];
  excerpt: string;
  contextBefore?: string | null;
  contextAfter?: string | null;
  pageNumber?: number | null;
  sectionTitle?: string | null;
  locator?: Json;
  extractionMethod?: EvidenceFragmentRow["extraction_method"];
  extractionConfidence?: number | null;
}): Promise<EvidenceFragmentRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("evidence_fragments")
    .insert({
      workspace_id: input.workspaceId,
      source_snapshot_id: input.sourceSnapshotId,
      fragment_type: input.fragmentType,
      excerpt: input.excerpt,
      context_before: input.contextBefore ?? null,
      context_after: input.contextAfter ?? null,
      page_number: input.pageNumber ?? null,
      section_title: input.sectionTitle ?? null,
      locator: input.locator ?? {},
      extraction_method: input.extractionMethod ?? "manual",
      extraction_confidence: input.extractionConfidence ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getEvidenceFragmentsForSnapshot(
  workspaceId: string,
  sourceSnapshotId: string,
): Promise<EvidenceFragmentRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("evidence_fragments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source_snapshot_id", sourceSnapshotId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findFragmentByExcerpt(
  workspaceId: string,
  sourceSnapshotId: string,
  excerpt: string,
): Promise<EvidenceFragmentRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("evidence_fragments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source_snapshot_id", sourceSnapshotId)
    .eq("excerpt", excerpt)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEvidenceFragmentsByIds(
  workspaceId: string,
  fragmentIds: string[],
): Promise<EvidenceFragmentRow[]> {
  if (fragmentIds.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("evidence_fragments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("id", fragmentIds);
  if (error) throw error;
  return data ?? [];
}
