import assert from "node:assert/strict";
import test from "node:test";
import { KNOWLEDGE_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import type { KnowledgeValidationOutput } from "@/server/ai/schemas/knowledge-validation-schema";
import { computeKnowledgeCandidateFingerprint } from "./fingerprint";
import { runKnowledgeDeterministicValidators } from "./deterministic-validators";
import { decideKnowledgeCandidateStatus } from "./promotion-policy";
import { knowledgeSemanticOutputToRecords } from "./semantic-validators";
import { coreKnowledgeName } from "./taxonomy";
import type { KnowledgeCandidateDraft, KnowledgeCitedBlock } from "./types";

function block(id: string, text: string): KnowledgeCitedBlock {
  return { id, textContent: text, sourceSnapshotId: "snap" };
}

function draft(overrides: Partial<KnowledgeCandidateDraft> & Pick<KnowledgeCandidateDraft, "canonicalName" | "citations">): KnowledgeCandidateDraft {
  return {
    objectType: "capability",
    description: "EFESO capability described in the source.",
    aliases: [],
    attributedToEfeso: true,
    testimonialAuthor: null,
    testimonialOrganization: null,
    tags: [],
    relations: [],
    ...overrides,
  };
}

function validationOutput(
  overrides: Partial<KnowledgeValidationOutput["validators"]> = {},
): KnowledgeValidationOutput {
  const pass = { result: "pass" as const, reason: "ok" };
  return {
    schema_version: KNOWLEDGE_VALIDATION_SCHEMA_VERSION,
    validators: {
      object_existence: pass,
      object_type: pass,
      naming: pass,
      grounding: { result: "pass", support_level: "direct", reason: "ok" },
      overgeneralization: pass,
      entity_attribution: pass,
      taxonomy_fit: pass,
      duplicate_semantics: pass,
      ...overrides,
    },
  };
}

function decide(input: {
  text: string;
  candidate: KnowledgeCandidateDraft;
  semantic?: KnowledgeValidationOutput;
  existingNames?: string[];
}) {
  const source = block("b1", input.text);
  const deterministic = runKnowledgeDeterministicValidators({
    draft: input.candidate,
    snapshotExists: true,
    blocksById: new Map([[source.id, source]]),
    existingObjectNames: input.existingNames ?? [],
  });
  const semantic = knowledgeSemanticOutputToRecords(input.semantic ?? validationOutput(), "run-k");
  return decideKnowledgeCandidateStatus({
    hasSupportingCitation: input.candidate.citations.length > 0,
    attributedToEfeso: input.candidate.attributedToEfeso,
    validations: [...deterministic, ...semantic],
  });
}

test("1 automotive support is not market leadership", () => {
  const text = "EFESO supported an automotive company in Brazil.";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "Market leader in automotive consulting in Brazil",
      objectType: "capability",
      citations: [{ blockId: "b1", exactQuote: "EFESO supported an automotive company in Brazil." }],
    }),
    semantic: validationOutput({
      overgeneralization: { result: "fail", reason: "support is not market leadership" },
    }),
  });
  assert.equal(decision.status, "rejected");
  assert.equal(decision.rejectionReasonCode, "overgeneralization");
});

test("2 BOOST may be used is not always used", () => {
  const text = "BOOST may be used in transformation programs.";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "BOOST",
      objectType: "methodology",
      description: "BOOST is always used in every EFESO transformation.",
      citations: [{ blockId: "b1", exactQuote: "BOOST may be used in transformation programs." }],
    }),
    semantic: validationOutput({
      overgeneralization: { result: "fail", reason: "may is not always" },
    }),
  });
  assert.equal(decision.status, "rejected");
});

test("3 result without EFESO attribution is not auto-accepted", () => {
  const text = "Client reduced inventory by 20%.";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "Inventory reduction",
      objectType: "result",
      attributedToEfeso: false,
      citations: [{ blockId: "b1", exactQuote: "Client reduced inventory by 20%." }],
    }),
  });
  assert.equal(decision.status, "needs_review");
  assert.equal(decision.rejectionReasonCode, "entity_attribution");
});

test("4 global mining support does not invent Vale", () => {
  const text = "EFESO supports mining companies globally.";
  const source = block("b1", text);
  const candidate = draft({
    canonicalName: "Vale",
    objectType: "case",
    citations: [{ blockId: "b1", exactQuote: "EFESO supports mining companies globally." }],
  });
  const deterministic = runKnowledgeDeterministicValidators({
    draft: candidate,
    snapshotExists: true,
    blocksById: new Map([[source.id, source]]),
    existingObjectNames: [],
  });
  assert.equal(deterministic.find((row) => row.validatorCode === "quote_integrity")?.result, "pass");
  const decision = decideKnowledgeCandidateStatus({
    hasSupportingCitation: true,
    attributedToEfeso: true,
    validations: [
      ...deterministic,
      ...knowledgeSemanticOutputToRecords(
        validationOutput({
          object_existence: { result: "fail", reason: "Vale is not in the source" },
          entity_attribution: { result: "fail", reason: "client invented" },
        }),
        "run-k",
      ),
    ],
  });
  assert.equal(decision.status, "rejected");
});

test("5 up to 30% is not stored as an exact factual 30%", () => {
  const text = "up to 30% productivity improvement";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "30% productivity improvement",
      objectType: "result",
      description: "30% productivity improvement",
      citations: [{ blockId: "b1", exactQuote: "up to 30% productivity improvement" }],
    }),
    semantic: validationOutput({
      overgeneralization: { result: "fail", reason: "up to is a ceiling, not an exact value" },
      grounding: { result: "fail", support_level: "unsupported", reason: "exact 30% is not stated" },
    }),
  });
  assert.equal(decision.status, "rejected");
});

test("6 expected savings is not reported actual", () => {
  const text = "Expected savings of €10m.";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "€10m savings",
      objectType: "result",
      description: "EFESO delivered reported actual savings of €10m.",
      citations: [{ blockId: "b1", exactQuote: "Expected savings of €10m." }],
    }),
    semantic: validationOutput({
      overgeneralization: { result: "fail", reason: "expected is not reported actual" },
    }),
  });
  assert.equal(decision.status, "rejected");
});

test("7 BOOST and BOOST methodology share a fingerprint alias core", () => {
  const workspaceId = "11111111-1111-4111-8111-111111111111";
  const a = computeKnowledgeCandidateFingerprint({
    workspaceId,
    objectType: "methodology",
    canonicalName: "BOOST",
  });
  const b = computeKnowledgeCandidateFingerprint({
    workspaceId,
    objectType: "methodology",
    canonicalName: "BOOST methodology",
  });
  assert.equal(a, b);
  assert.equal(coreKnowledgeName("BOOST"), coreKnowledgeName("BOOST Methodology"));
});

test("8 similar capabilities are not merged automatically", () => {
  const text = "EFESO Asset Productivity programs improve maintenance.";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "Production Productivity",
      citations: [{ blockId: "b1", exactQuote: "EFESO Asset Productivity programs improve maintenance." }],
    }),
    existingNames: ["Asset Productivity"],
    semantic: validationOutput({
      duplicate_semantics: { result: "warn", reason: "similar but not the same object" },
    }),
  });
  assert.equal(decision.status, "needs_review");
  assert.notEqual(
    computeKnowledgeCandidateFingerprint({
      workspaceId: "w",
      objectType: "capability",
      canonicalName: "Asset Productivity",
    }),
    computeKnowledgeCandidateFingerprint({
      workspaceId: "w",
      objectType: "capability",
      canonicalName: "Production Productivity",
    }),
  );
});

test("9 competitor capability is not attributed to EFESO", () => {
  const text = "Competitor Alpha offers digital twin manufacturing services.";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "Digital Twin Manufacturing",
      attributedToEfeso: false,
      citations: [{ blockId: "b1", exactQuote: "Competitor Alpha offers digital twin manufacturing services." }],
    }),
    semantic: validationOutput({
      entity_attribution: { result: "fail", reason: "competitor, not EFESO" },
    }),
  });
  assert.equal(decision.status, "needs_review");
});

test("10 testimonial without a title does not invent a job title", () => {
  const text = '"The program changed how we work." — Maria';
  const candidate = draft({
    canonicalName: "Client testimonial",
    objectType: "testimonial",
    testimonialAuthor: "Maria",
    testimonialOrganization: null,
    citations: [{ blockId: "b1", exactQuote: '"The program changed how we work." — Maria' }],
  });
  assert.equal(candidate.testimonialAuthor, "Maria");
  assert.equal(candidate.testimonialOrganization, null);
  assert.equal("title" in candidate, false);
  const decision = decide({
    text,
    candidate,
    semantic: validationOutput({
      naming: { result: "pass", reason: "author preserved; no invented title" },
    }),
  });
  assert.equal(decision.status, "validated");
});

test("fuzzy quotes are rejected by includes-strict quote integrity", () => {
  const text = "EFESO helps organizations improve operational performance through Operational Excellence programs.";
  const candidate = draft({
    canonicalName: "Operational Excellence",
    citations: [{ blockId: "b1", exactQuote: "EFESO helps firms improve ops performance" }],
  });
  const deterministic = runKnowledgeDeterministicValidators({
    draft: candidate,
    snapshotExists: true,
    blocksById: new Map([["b1", block("b1", text)]]),
    existingObjectNames: [],
  });
  assert.equal(deterministic.find((row) => row.validatorCode === "quote_integrity")?.result, "fail");
  assert.equal(hasBlocking(deterministic), true);
});

test("unmapped taxonomy suggestions require review", () => {
  const text = "EFESO helps organizations improve operational performance through Operational Excellence programs.";
  const candidate = draft({
    canonicalName: "Operational Excellence",
    tags: [{ category: "CAPABILITY_DOMAIN", name: "OpEx Magic Transformation Cloud" }],
    citations: [{ blockId: "b1", exactQuote: "Operational Excellence programs" }],
  });
  const deterministic = runKnowledgeDeterministicValidators({
    draft: candidate,
    snapshotExists: true,
    blocksById: new Map([["b1", block("b1", text)]]),
    existingObjectNames: [],
  });
  assert.equal(deterministic.find((row) => row.validatorCode === "taxonomy_mapping_validity")?.result, "warn");
});

test("indirect grounding does not auto-promote", () => {
  const text = "EFESO helps organizations improve operational performance through Operational Excellence programs.";
  const decision = decide({
    text,
    candidate: draft({
      canonicalName: "Operational Excellence",
      citations: [{ blockId: "b1", exactQuote: "Operational Excellence programs" }],
    }),
    semantic: validationOutput({
      grounding: { result: "pass", support_level: "indirect", reason: "paraphrase" },
    }),
  });
  assert.equal(decision.status, "needs_review");
  assert.equal(decision.rejectionReasonCode, "grounding");
});

function hasBlocking(records: { result: string; severity: string }[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}
