import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const SOURCE_FILES_BUCKET = "source-files";
export const SIGNED_URL_EXPIRES_SECONDS = 60;

function sanitizeFileName(originalFileName: string): string {
  const base = originalFileName.replaceAll("\\", "/").split("/").pop()?.trim() || "original.bin";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return cleaned || "original.bin";
}

/**
 * Object key: <workspace_id>/<source_id>/<snapshot_id>/<original_filename>
 * Workspace, source and snapshot ids are always server-derived.
 */
export function buildSourceObjectKey(input: {
  workspaceId: string;
  sourceId: string;
  snapshotId: string;
  originalFileName: string;
}): string {
  return [
    input.workspaceId,
    input.sourceId,
    input.snapshotId,
    sanitizeFileName(input.originalFileName),
  ].join("/");
}

export async function uploadSourceFile(input: {
  workspaceId: string;
  sourceId: string;
  snapshotId: string;
  originalFileName: string;
  bytes: Uint8Array | Buffer;
  mimeType?: string | null;
}): Promise<string> {
  const storageKey = buildSourceObjectKey(input);
  const firstSegment = storageKey.split("/")[0];
  if (firstSegment !== input.workspaceId) {
    throw new Error("STORAGE_PATH_WORKSPACE_MISMATCH");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.storage.from(SOURCE_FILES_BUCKET).upload(storageKey, input.bytes, {
    contentType: input.mimeType || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return storageKey;
}

export async function createSourceFileSignedUrl(storageKey: string, workspaceId: string): Promise<string> {
  const firstSegment = storageKey.split("/")[0];
  if (firstSegment !== workspaceId) {
    throw new Error("STORAGE_PATH_WORKSPACE_MISMATCH");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from(SOURCE_FILES_BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_EXPIRES_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("SIGNED_URL_MISSING");
  return data.signedUrl;
}

/** Best-effort cleanup when snapshot insert fails after upload. */
export async function deleteOrphanedSourceFile(storageKey: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(SOURCE_FILES_BUCKET).remove([storageKey]);
  if (error) {
    console.error("Failed to remove orphaned source-files object", storageKey, error.message);
  }
}
