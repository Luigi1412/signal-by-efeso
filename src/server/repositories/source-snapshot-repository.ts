import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json, SourceSnapshotRow } from "@/types/database";

export async function findSnapshotByHash(
  workspaceId: string,
  sourceId: string,
  contentHash: string,
): Promise<SourceSnapshotRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("source_snapshots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSourceSnapshot(
  workspaceId: string,
  snapshotId: string,
): Promise<SourceSnapshotRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("source_snapshots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSourceSnapshotsByIds(
  workspaceId: string,
  snapshotIds: string[],
): Promise<SourceSnapshotRow[]> {
  if (snapshotIds.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("source_snapshots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("id", snapshotIds);
  if (error) throw error;
  return data ?? [];
}

export async function listSnapshotsForSource(
  workspaceId: string,
  sourceId: string,
): Promise<SourceSnapshotRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("source_snapshots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .order("captured_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Immutable insert. Never UPDATE a snapshot — reuse findSnapshotByHash instead.
 */
export async function createSourceSnapshot(input: {
  id?: string;
  workspaceId: string;
  sourceId: string;
  capturedByResearchRunId?: string | null;
  publicationDate?: string | null;
  title?: string | null;
  author?: string | null;
  languageCode?: string | null;
  contentHash: string;
  mimeType?: string | null;
  pageCount?: number | null;
  snapshotMode: SourceSnapshotRow["snapshot_mode"];
  storageKey?: string | null;
  normalizedText?: string | null;
  metadata?: Json;
}): Promise<SourceSnapshotRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("source_snapshots")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      workspace_id: input.workspaceId,
      source_id: input.sourceId,
      captured_by_research_run_id: input.capturedByResearchRunId ?? null,
      publication_date: input.publicationDate ?? null,
      title: input.title ?? null,
      author: input.author ?? null,
      language_code: input.languageCode ?? null,
      content_hash: input.contentHash,
      mime_type: input.mimeType ?? null,
      page_count: input.pageCount ?? null,
      snapshot_mode: input.snapshotMode,
      storage_key: input.storageKey ?? null,
      normalized_text: input.normalizedText ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
