import "server-only";
import { randomUUID } from "node:crypto";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { insertContentBlocks } from "@/server/extraction/pipeline-persistence";
import { parseControlledDocument } from "@/server/parsers";
import type { ParsedContentBlock } from "@/server/parsers/types";
import { contentHashForCapture } from "@/server/storage/content-hash";
import { getExternalResearchLimits } from "./config";
import { extractHtmlText } from "./html";
import { mapExternalTypeToSourceType, mapQualityToSourceTier } from "./quality";
import { hostnameOf } from "./normalize";
import type { ExternalSourceCandidateRow, FetchedDocument } from "./types";

export interface IngestedSnapshot {
  candidateId: string;
  sourceId: string;
  snapshotId: string;
  reused: boolean;
  parserName: string;
  parserVersion: string;
  blocks: ParsedContentBlock[];
}

export async function ingestFetchedDocument(input: {
  workspaceId: string;
  researchRunId: string;
  legacyResearchRunId: string;
  candidate: ExternalSourceCandidateRow;
  document: FetchedDocument;
  totalBytesUsed: number;
}): Promise<IngestedSnapshot> {
  const limits = getExternalResearchLimits();
  if (input.totalBytesUsed + input.document.bytes.byteLength > limits.maxTotalBytes) {
    throw new Error("TOO_LARGE");
  }
  const db = createPipelineAdminClient();
  const canonical = input.candidate.canonical_url || input.document.finalUrl;
  const domain = hostnameOf(canonical);
  const sourceType = mapExternalTypeToSourceType(input.candidate.source_type);
  const sourceTier = mapQualityToSourceTier(input.candidate.source_quality);

  let sourceId: string | null = null;
  const existingSource = await db
    .from("sources")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("canonical_url", canonical)
    .maybeSingle();
  if (existingSource.data && typeof existingSource.data === "object" && "id" in existingSource.data) {
    sourceId = String((existingSource.data as { id: string }).id);
  } else {
    const created = await db
      .from("sources")
      .insert({
        workspace_id: input.workspaceId,
        canonical_url: canonical,
        domain,
        publisher_name: input.candidate.publisher,
        source_type: sourceType,
        source_tier: sourceTier,
        is_primary_source: input.candidate.source_quality === "primary",
        access_type: "public",
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    sourceId = String((created.data as { id: string }).id);
  }

  await db.from("research_run_sources").upsert(
    {
      workspace_id: input.workspaceId,
      research_run_id: input.legacyResearchRunId,
      source_id: sourceId,
      research_wave: "corporate_truth",
      disposition: "retained",
      discovery_method: "search",
    },
    { onConflict: "research_run_id,source_id" },
  );

  const html = input.document.mimeType.includes("html")
    ? extractHtmlText(new TextDecoder().decode(input.document.bytes))
    : null;
  const normalizedText = html?.text ?? null;
  const parseMime = input.document.mimeType.includes("pdf") ? "application/pdf" : "text/plain";
  const parseBytes = parseMime === "text/plain" && html ? new TextEncoder().encode(html.text) : input.document.bytes;
  const parsed = await parseControlledDocument(parseBytes, {
    mimeType: parseMime,
    fileName: parseMime === "application/pdf" ? "source.pdf" : "source.txt",
  });
  if (!parsed.ok) {
    throw new Error(parsed.code === "UNSUPPORTED_TYPE" ? "PARSER_UNSUPPORTED" : parsed.code);
  }

  const contentHash = contentHashForCapture({
    originalFileBytes: input.document.bytes,
    normalizedText: normalizedText ?? parsed.blocks.map((block) => block.textContent).join("\n\n"),
  });

  const existingSnap = await db
    .from("source_snapshots")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("source_id", sourceId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  let snapshotId: string;
  let reused = false;
  if (existingSnap.data && typeof existingSnap.data === "object" && "id" in existingSnap.data) {
    snapshotId = String((existingSnap.data as { id: string }).id);
    reused = true;
  } else {
    snapshotId = randomUUID();
    const inserted = await db
      .from("source_snapshots")
      .insert({
        id: snapshotId,
        workspace_id: input.workspaceId,
        source_id: sourceId,
        captured_by_research_run_id: input.legacyResearchRunId,
        publication_date: input.candidate.published_at,
        title: input.candidate.title ?? html?.title ?? input.document.title,
        content_hash: contentHash,
        mime_type: input.document.mimeType,
        snapshot_mode: "full",
        normalized_text: normalizedText ?? parsed.blocks.map((block) => block.textContent).join("\n\n"),
        metadata: {
          research_run_id: input.candidate.research_run_id,
          source_candidate_id: input.candidate.id,
          source_tier: input.candidate.source_tier,
          source_type: input.candidate.source_type,
          fetched_at: new Date().toISOString(),
          external_url: input.document.finalUrl,
          publisher: input.candidate.publisher,
          published_at: input.candidate.published_at,
        },
      })
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    snapshotId = String((inserted.data as { id: string }).id);
  }

  if (!reused) {
    await insertContentBlocks({
      workspaceId: input.workspaceId,
      sourceSnapshotId: snapshotId,
      parserName: parsed.parserName,
      parserVersion: parsed.parserVersion,
      blocks: parsed.blocks,
    });
  }

  return {
    candidateId: input.candidate.id,
    sourceId,
    snapshotId,
    reused,
    parserName: parsed.parserName,
    parserVersion: parsed.parserVersion,
    blocks: parsed.blocks,
  };
}

export { isLowYieldNormalizedText, isThinNormalizedText } from "./thin-source";

export async function getSnapshotNormalizedText(snapshotId: string): Promise<string> {
  const db = createPipelineAdminClient();
  const existing = await db.from("source_snapshots").select("normalized_text").eq("id", snapshotId).maybeSingle();
  if (!existing.data || typeof existing.data !== "object" || !("normalized_text" in existing.data)) return "";
  return String((existing.data as { normalized_text?: string | null }).normalized_text ?? "");
}

export async function findReusableSnapshot(
  workspaceId: string,
  canonicalUrl: string,
): Promise<{ sourceId: string; snapshotId: string } | null> {
  const db = createPipelineAdminClient();
  const existingSource = await db
    .from("sources")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("canonical_url", canonicalUrl)
    .maybeSingle();
  if (!existingSource.data || typeof existingSource.data !== "object" || !("id" in existingSource.data)) {
    return null;
  }
  const sourceId = String((existingSource.data as { id: string }).id);
  const existingSnap = await db
    .from("source_snapshots")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existingSnap.data || typeof existingSnap.data !== "object" || !("id" in existingSnap.data)) {
    return null;
  }
  return { sourceId, snapshotId: String((existingSnap.data as { id: string }).id) };
}

export async function attachSnapshotToLegacyRun(input: {
  workspaceId: string;
  legacyResearchRunId: string;
  sourceId: string;
}): Promise<void> {
  const db = createPipelineAdminClient();
  await db.from("research_run_sources").upsert(
    {
      workspace_id: input.workspaceId,
      research_run_id: input.legacyResearchRunId,
      source_id: input.sourceId,
      research_wave: "corporate_truth",
      disposition: "retained",
      discovery_method: "search",
    },
    { onConflict: "research_run_id,source_id" },
  );
}
