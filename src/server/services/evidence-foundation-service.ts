import "server-only";
import { randomUUID } from "node:crypto";
import { allowMockFallback, isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as claimEvidenceRepository from "@/server/repositories/claim-evidence-repository";
import * as claimRepository from "@/server/repositories/claim-repository";
import * as evidenceFragmentRepository from "@/server/repositories/evidence-fragment-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as researchRunSourceRepository from "@/server/repositories/research-run-source-repository";
import * as sourceRepository from "@/server/repositories/source-repository";
import * as sourceSnapshotRepository from "@/server/repositories/source-snapshot-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAuthUserId } from "@/server/session";
import { contentHashForCapture } from "@/server/storage/content-hash";
import {
  createSourceFileSignedUrl,
  deleteOrphanedSourceFile,
  uploadSourceFile,
} from "@/server/storage/source-file-storage";
import {
  attachEvidenceToClaimInput,
  captureSourceSnapshotInput,
  createAtomicClaimInput,
  createManualEvidenceFragmentInput,
  registerSourceInput,
  signedSourceUrlInput,
  uuidSchema,
  type CaptureSourceSnapshotInput,
  type CreateAtomicClaimInput,
  type RegisterSourceInput,
} from "@/server/validation";
import type { ClaimTraceability, SnapshotVersioningProof } from "@/types/evidence-foundation";
import type { ClaimRow, SourceRow, SourceSnapshotRow } from "@/types/database";
import { getBlockById } from "@/server/extraction/pipeline-persistence";

async function requireWorkspaceId(): Promise<string> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  return workspace.id;
}

export async function registerSource(raw: RegisterSourceInput): Promise<SourceRow> {
  const input = registerSourceInput.parse(raw);
  const workspaceId = await requireWorkspaceId();

  let source: SourceRow | null = null;
  if (input.canonicalUrl) {
    source = await sourceRepository.findSourceByCanonicalUrl(workspaceId, input.canonicalUrl);
  }

  if (source) {
    await sourceRepository.touchSourceLastSeen(workspaceId, source.id);
  } else {
    const domain =
      input.domain ??
      (input.canonicalUrl ? safeHostname(input.canonicalUrl) : null);
    source = await sourceRepository.createSource({
      workspaceId,
      canonicalUrl: input.canonicalUrl ?? null,
      domain,
      publisherName: input.publisherName,
      sourceType: input.sourceType,
      sourceTier: input.sourceTier,
      isPrimarySource: input.isPrimarySource,
      languageCode: input.languageCode,
      countryCode: input.countryCode,
      accessType: input.accessType,
    });
  }

  if (input.researchRunId) {
    const run = await researchRunRepository.getResearchRun(workspaceId, input.researchRunId);
    if (!run) throw new Error("RESEARCH_RUN_NOT_FOUND");
    await researchRunSourceRepository.linkSourceToResearchRun({
      workspaceId,
      researchRunId: run.id,
      sourceId: source.id,
      researchWave: input.researchWave ?? "manual",
      disposition: input.disposition ?? "discovered",
      discoveryMethod: input.discoveryMethod ?? "manual",
    });
  }

  return source;
}

export async function captureSourceSnapshot(
  raw: CaptureSourceSnapshotInput & { originalFileBytes?: Uint8Array | Buffer | null },
): Promise<{ snapshot: SourceSnapshotRow; reused: boolean }> {
  const input = captureSourceSnapshotInput.parse(raw);
  const workspaceId = await requireWorkspaceId();

  const source = await sourceRepository.getSourceById(workspaceId, input.sourceId);
  if (!source) throw new Error("SOURCE_NOT_FOUND");

  if (input.capturedByResearchRunId) {
    const run = await researchRunRepository.getResearchRun(workspaceId, input.capturedByResearchRunId);
    if (!run) throw new Error("RESEARCH_RUN_NOT_FOUND");
  }

  const contentHash = contentHashForCapture({
    originalFileBytes: raw.originalFileBytes,
    normalizedText: input.normalizedText,
  });

  const existing = await sourceSnapshotRepository.findSnapshotByHash(
    workspaceId,
    source.id,
    contentHash,
  );
  if (existing) {
    return { snapshot: existing, reused: true };
  }

  const snapshotId = randomUUID();
  let storageKey: string | null = null;

  if (raw.originalFileBytes && raw.originalFileBytes.byteLength > 0) {
    storageKey = await uploadSourceFile({
      workspaceId,
      sourceId: source.id,
      snapshotId,
      originalFileName: input.originalFileName || "original.bin",
      bytes: raw.originalFileBytes,
      mimeType: input.mimeType,
    });
  }

  try {
    const snapshot = await sourceSnapshotRepository.createSourceSnapshot({
      id: snapshotId,
      workspaceId,
      sourceId: source.id,
      capturedByResearchRunId: input.capturedByResearchRunId,
      publicationDate: input.publicationDate,
      title: input.title,
      author: input.author,
      languageCode: input.languageCode,
      contentHash,
      mimeType: input.mimeType,
      pageCount: input.pageCount,
      snapshotMode: input.snapshotMode,
      storageKey,
      normalizedText: input.normalizedText ?? null,
    });
    return { snapshot, reused: false };
  } catch (error) {
    if (storageKey) await deleteOrphanedSourceFile(storageKey);
    throw error;
  }
}

export async function createManualEvidenceFragment(raw: {
  sourceSnapshotId: string;
  fragmentType: string;
  excerpt: string;
  contextBefore?: string | null;
  contextAfter?: string | null;
  pageNumber?: number | null;
  sectionTitle?: string | null;
}) {
  const input = createManualEvidenceFragmentInput.parse(raw);
  const workspaceId = await requireWorkspaceId();
  const snapshot = await sourceSnapshotRepository.getSourceSnapshot(workspaceId, input.sourceSnapshotId);
  if (!snapshot) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND");

  return evidenceFragmentRepository.createEvidenceFragment({
    workspaceId,
    sourceSnapshotId: snapshot.id,
    fragmentType: input.fragmentType,
    excerpt: input.excerpt,
    contextBefore: input.contextBefore,
    contextAfter: input.contextAfter,
    pageNumber: input.pageNumber,
    sectionTitle: input.sectionTitle,
    extractionMethod: "manual",
  });
}

export async function createAtomicClaim(raw: CreateAtomicClaimInput): Promise<ClaimRow> {
  const input = createAtomicClaimInput.parse(raw);
  const workspaceId = await requireWorkspaceId();

  const analysis = await analysisRepository.getAnalysisById(workspaceId, input.analysisId);
  if (!analysis) throw new Error("ANALYSIS_NOT_FOUND");

  const run = await researchRunRepository.getResearchRun(workspaceId, input.originatingResearchRunId);
  if (!run || run.analysis_id !== analysis.id) throw new Error("RESEARCH_RUN_NOT_FOUND");

  if (input.verificationStatus === "corroborated") {
    throw new Error("AUTOMATIC_CORROBORATION_FORBIDDEN");
  }

  if (input.supersedesClaimId) {
    const previous = await claimRepository.getClaimById(workspaceId, input.supersedesClaimId);
    if (
      !previous ||
      previous.analysis_id !== analysis.id ||
      previous.company_id !== analysis.company_id
    ) {
      throw new Error("SUPERSEDED_CLAIM_SCOPE_MISMATCH");
    }
  }

  const claim = await claimRepository.createClaim({
    workspaceId,
    analysisId: analysis.id,
    originatingResearchRunId: run.id,
    companyId: analysis.company_id,
    entityId: input.entityId,
    statement: input.statement,
    claimCategory: input.claimCategory,
    claimType: input.claimType,
    verificationStatus: input.verificationStatus ?? "unverified",
    reviewStatus: input.reviewStatus,
    geographyLevel: input.geographyLevel,
    countryCode: input.countryCode,
    periodType: input.periodType,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    asOfDate: input.asOfDate,
    confidenceScore: input.confidenceScore,
    confidenceMethodVersion:
      input.confidenceScore != null
        ? (input.confidenceMethodVersion ?? "manual-v1")
        : input.confidenceMethodVersion,
    supersedesClaimId: input.supersedesClaimId,
  });

  if (input.supersedesClaimId) {
    await claimRepository.markClaimSuperseded(workspaceId, input.supersedesClaimId);
  }

  return claim;
}

export async function attachEvidenceToClaim(raw: {
  claimId: string;
  evidenceFragmentId: string;
  relationship: "supports" | "contradicts" | "contextualizes";
  directness: "direct" | "strong_indirect" | "weak_indirect";
  relevanceScore?: number | null;
}) {
  const input = attachEvidenceToClaimInput.parse(raw);
  const workspaceId = await requireWorkspaceId();

  const claim = await claimRepository.getClaimById(workspaceId, input.claimId);
  if (!claim) throw new Error("CLAIM_NOT_FOUND");

  const fragments = await evidenceFragmentRepository.getEvidenceFragmentsByIds(workspaceId, [
    input.evidenceFragmentId,
  ]);
  if (fragments.length !== 1) throw new Error("EVIDENCE_FRAGMENT_NOT_FOUND");

  return claimEvidenceRepository.linkClaimEvidence({
    workspaceId,
    claimId: claim.id,
    evidenceFragmentId: input.evidenceFragmentId,
    relationship: input.relationship,
    directness: input.directness,
    relevanceScore: input.relevanceScore,
  });
}

export async function getClaimTraceability(claimId: string): Promise<ClaimTraceability | null> {
  const parsed = uuidSchema.parse(claimId);
  const workspaceId = await requireWorkspaceId();
  const claim = await claimRepository.getClaimById(workspaceId, parsed);
  if (!claim) return null;

  const links = await claimEvidenceRepository.getEvidenceForClaim(workspaceId, claim.id);
  const fragmentIds = [...new Set(links.map((row) => row.evidence_fragment_id))];
  const fragments = await evidenceFragmentRepository.getEvidenceFragmentsByIds(workspaceId, fragmentIds);
  const fragmentById = new Map(fragments.map((row) => [row.id, row]));

  const snapshotIds = [...new Set(fragments.map((row) => row.source_snapshot_id))];
  const snapshots = await sourceSnapshotRepository.getSourceSnapshotsByIds(workspaceId, snapshotIds);
  const snapshotById = new Map(snapshots.map((row) => [row.id, row]));

  const sourceIds = [...new Set(snapshots.map((row) => row.source_id))];
  const sources = await sourceRepository.getSourcesByIds(workspaceId, sourceIds);
  const sourceById = new Map(sources.map((row) => [row.id, row]));

  const evidence = [];
  for (const relationship of links) {
    const fragment = fragmentById.get(relationship.evidence_fragment_id);
    if (!fragment) continue;
    const snapshot = snapshotById.get(fragment.source_snapshot_id);
    if (!snapshot) continue;
    const source = sourceById.get(snapshot.source_id);
    if (!source) continue;
    const researchRunSources = await researchRunSourceRepository.getResearchRunSourcesForSource(
      workspaceId,
      source.id,
    );
    const contentBlock = fragment.source_content_block_id
      ? await getBlockById(fragment.source_content_block_id)
      : null;
    evidence.push({ relationship, fragment, snapshot, source, researchRunSources, contentBlock });
  }

  return { claim, evidence };
}

export async function getTraceabilityForAnalysis(analysisId: string): Promise<ClaimTraceability[]> {
  const parsed = uuidSchema.parse(analysisId);
  const workspaceId = await requireWorkspaceId();
  const analysis = await analysisRepository.getAnalysisById(workspaceId, parsed);
  if (!analysis) return [];

  const claims = await claimRepository.getClaimsForAnalysis(workspaceId, analysis.id);
  const results: ClaimTraceability[] = [];
  for (const claim of claims) {
    const trace = await getClaimTraceability(claim.id);
    if (trace) results.push(trace);
  }
  return results;
}

export async function getTraceabilityForCompany(companyId: string): Promise<ClaimTraceability[]> {
  const parsed = uuidSchema.parse(companyId);
  const workspaceId = await requireWorkspaceId();
  const claims = await claimRepository.getClaimsForCompany(workspaceId, parsed);
  const results: ClaimTraceability[] = [];
  for (const claim of claims) {
    const trace = await getClaimTraceability(claim.id);
    if (trace) results.push(trace);
  }
  return results;
}

export async function getSignedSourceUrlForSnapshot(snapshotId: string): Promise<string> {
  const input = signedSourceUrlInput.parse({ snapshotId });
  const workspaceId = await requireWorkspaceId();
  const snapshot = await sourceSnapshotRepository.getSourceSnapshot(workspaceId, input.snapshotId);
  if (!snapshot?.storage_key) throw new Error("SOURCE_FILE_NOT_FOUND");
  return createSourceFileSignedUrl(snapshot.storage_key, workspaceId);
}

export async function proveSnapshotVersioning(input: {
  sourceId: string;
  researchRunId?: string | null;
  contentA: string;
  contentB: string;
  fileNameA?: string;
  fileNameB?: string;
}): Promise<SnapshotVersioningProof> {
  const captureA = await captureSourceSnapshot({
    sourceId: input.sourceId,
    capturedByResearchRunId: input.researchRunId,
    title: "Version A",
    snapshotMode: "full",
    normalizedText: input.contentA,
    mimeType: "text/plain",
    originalFileName: input.fileNameA ?? "version-a.txt",
    originalFileBytes: Buffer.from(input.contentA, "utf8"),
  });
  const captureB = await captureSourceSnapshot({
    sourceId: input.sourceId,
    capturedByResearchRunId: input.researchRunId,
    title: "Version B",
    snapshotMode: "full",
    normalizedText: input.contentB,
    mimeType: "text/plain",
    originalFileName: input.fileNameB ?? "version-b.txt",
    originalFileBytes: Buffer.from(input.contentB, "utf8"),
  });
  const recaptureB = await captureSourceSnapshot({
    sourceId: input.sourceId,
    capturedByResearchRunId: input.researchRunId,
    title: "Version B recapture",
    snapshotMode: "full",
    normalizedText: input.contentB,
    mimeType: "text/plain",
    originalFileName: input.fileNameB ?? "version-b.txt",
    originalFileBytes: Buffer.from(input.contentB, "utf8"),
  });

  if (captureA.snapshot.id === captureB.snapshot.id) {
    throw new Error("SNAPSHOT_VERSIONS_COLLAPSED");
  }
  if (captureA.snapshot.content_hash === captureB.snapshot.content_hash) {
    throw new Error("SNAPSHOT_HASHES_COLLAPSED");
  }
  if (!recaptureB.reused || recaptureB.snapshot.id !== captureB.snapshot.id) {
    throw new Error("SNAPSHOT_B_NOT_REUSED");
  }

  const workspaceId = await requireWorkspaceId();
  const snapshots = await sourceSnapshotRepository.listSnapshotsForSource(workspaceId, input.sourceId);

  return {
    sourceId: input.sourceId,
    snapshotAId: captureA.snapshot.id,
    snapshotBId: captureB.snapshot.id,
    hashA: captureA.snapshot.content_hash,
    hashB: captureB.snapshot.content_hash,
    reusedBId: recaptureB.snapshot.id,
    snapshotCount: snapshots.length,
  };
}

export function shouldUseMockEvidenceFallback(): boolean {
  return allowMockFallback();
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
