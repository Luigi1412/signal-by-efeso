import "server-only";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as claimRepository from "@/server/repositories/claim-repository";
import * as evidenceFragmentRepository from "@/server/repositories/evidence-fragment-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import {
  attachEvidenceToClaim,
  captureSourceSnapshot,
  createAtomicClaim,
  createManualEvidenceFragment,
  getClaimTraceability,
  proveSnapshotVersioning,
  registerSource,
} from "@/server/services/evidence-foundation-service";
import { requireAuthUserId } from "@/server/session";
import type { ClaimTraceability, SnapshotVersioningProof } from "@/types/evidence-foundation";

export const FIXTURE_PUBLISHER = "SIGNAL Evidence Fixture";
export const FIXTURE_CANONICAL_URL = "https://example.invalid/signal-evidence-foundation/natura";
export const FIXTURE_DOCUMENT = [
  "SIGNAL EVIDENCE FIXTURE — SYNTHETIC / DEVELOPMENT ONLY",
  "",
  "Este conteúdo sintético existe exclusivamente para validar a rastreabilidade Source → Snapshot → Evidence → Claim no ambiente de desenvolvimento do Signal.",
  "",
  "This is not Natura business information.",
].join("\n");

export const FIXTURE_DOCUMENT_B = `${FIXTURE_DOCUMENT}\n\nVersão B controlada para prova de imutabilidade do SourceSnapshot.`;

export const FIXTURE_EXCERPT =
  "Este conteúdo sintético existe exclusivamente para validar a rastreabilidade Source → Snapshot → Evidence → Claim no ambiente de desenvolvimento do Signal.";

export const FIXTURE_CLAIM_STATEMENT = "Este é um achado sintético usado para validar a cadeia de evidência do Signal.";

export type DevelopmentFixtureResult =
  | {
      ok: true;
      analysisId: string;
      researchRunId: string;
      sourceId: string;
      snapshotId: string;
      fragmentId: string;
      claimId: string;
      versioning: SnapshotVersioningProof;
      traceability: ClaimTraceability;
    }
  | { ok: false; reason: "production" | "no_research_run" | "analysis_not_found" };

/**
 * DEVELOPMENT-ONLY synthetic chain. Idempotent for Source / Snapshot / Claim.
 * Must never run in production and must not be imported into seed.sql.
 */
export async function ensureDevelopmentEvidenceFixture(analysisId: string): Promise<DevelopmentFixtureResult> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "production" };
  }

  await requireAuthUserId();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) return { ok: false, reason: "analysis_not_found" };

  const analysis = await analysisRepository.getAnalysisById(workspace.id, analysisId);
  if (!analysis) return { ok: false, reason: "analysis_not_found" };

  const run = await researchRunRepository.getLatestRunForAnalysis(workspace.id, analysis.id);
  if (!run) return { ok: false, reason: "no_research_run" };

  const source = await registerSource({
    canonicalUrl: FIXTURE_CANONICAL_URL,
    publisherName: FIXTURE_PUBLISHER,
    sourceType: "other",
    sourceTier: "E",
    isPrimarySource: false,
    accessType: "workspace_internal",
    languageCode: "pt",
    countryCode: "BR",
    researchRunId: run.id,
    researchWave: "manual",
    disposition: "retained",
    discoveryMethod: "manual",
  });

  const capture = await captureSourceSnapshot({
    sourceId: source.id,
    capturedByResearchRunId: run.id,
    title: "SIGNAL Evidence Fixture — documento sintético",
    author: "SIGNAL development",
    languageCode: "pt",
    mimeType: "text/plain",
    snapshotMode: "full",
    normalizedText: FIXTURE_DOCUMENT,
    originalFileName: "signal-evidence-fixture.txt",
    originalFileBytes: Buffer.from(FIXTURE_DOCUMENT, "utf8"),
  });

  const existingFragment = await evidenceFragmentRepository.findFragmentByExcerpt(
    workspace.id,
    capture.snapshot.id,
    FIXTURE_EXCERPT,
  );
  const fragment =
    existingFragment ??
    (await createManualEvidenceFragment({
      sourceSnapshotId: capture.snapshot.id,
      fragmentType: "paragraph",
      excerpt: FIXTURE_EXCERPT,
      contextBefore: "SIGNAL EVIDENCE FIXTURE — SYNTHETIC / DEVELOPMENT ONLY",
      contextAfter: "This is not Natura business information.",
      sectionTitle: "Fixture",
    }));

  const existingClaim = await claimRepository.findClaimByStatement(
    workspace.id,
    analysis.id,
    FIXTURE_CLAIM_STATEMENT,
  );
  const claim =
    existingClaim ??
    (await createAtomicClaim({
      analysisId: analysis.id,
      originatingResearchRunId: run.id,
      statement: FIXTURE_CLAIM_STATEMENT,
      claimCategory: "other",
      claimType: "fact",
      verificationStatus: "supported",
      reviewStatus: "pending",
      geographyLevel: "country",
      countryCode: "BR",
      periodType: "not_applicable",
      confidenceScore: null,
      confidenceMethodVersion: null,
    }));

  await attachEvidenceToClaim({
    claimId: claim.id,
    evidenceFragmentId: fragment.id,
    relationship: "supports",
    directness: "direct",
  });

  const versioning = await proveSnapshotVersioning({
    sourceId: source.id,
    researchRunId: run.id,
    contentA: FIXTURE_DOCUMENT,
    contentB: FIXTURE_DOCUMENT_B,
    fileNameA: "signal-evidence-fixture.txt",
    fileNameB: "signal-evidence-fixture-b.txt",
  });

  const traceability = await getClaimTraceability(claim.id);
  if (!traceability) {
    throw new Error("FIXTURE_TRACEABILITY_MISSING");
  }

  return {
    ok: true,
    analysisId: analysis.id,
    researchRunId: run.id,
    sourceId: source.id,
    snapshotId: capture.snapshot.id,
    fragmentId: fragment.id,
    claimId: claim.id,
    versioning,
    traceability,
  };
}
