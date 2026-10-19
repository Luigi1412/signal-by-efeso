import { locateExactQuote } from "@/server/extraction/quote";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import { KNOWLEDGE_DETERMINISTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import { mapSuggestedTag, KNOWLEDGE_OBJECT_TYPES } from "./taxonomy";
import type { KnowledgeCandidateDraft, KnowledgeCitedBlock } from "./types";

function record(
  code: string,
  result: ValidationRecord["result"],
  severity: ValidationRecord["severity"],
  message: string,
  details: Record<string, unknown> = {},
): ValidationRecord {
  return {
    validatorCode: code,
    validatorVersion: KNOWLEDGE_DETERMINISTIC_VALIDATOR_VERSION,
    validatorType: "deterministic",
    result,
    severity,
    message,
    details,
  };
}

export function runKnowledgeDeterministicValidators(input: {
  draft: KnowledgeCandidateDraft;
  snapshotExists: boolean;
  blocksById: Map<string, KnowledgeCitedBlock>;
  existingObjectNames: string[];
}): ValidationRecord[] {
  const { draft, snapshotExists, blocksById, existingObjectNames } = input;
  return [
    schemaValidity(draft),
    sourceExists(snapshotExists),
    blockExists(draft, blocksById),
    citationExists(draft),
    quoteIntegrity(draft, blocksById),
    objectTypeAllowed(draft),
    canonicalNamePresent(draft),
    duplicateDetection(draft, existingObjectNames),
    taxonomyMappingValidity(draft),
  ];
}

function schemaValidity(draft: KnowledgeCandidateDraft): ValidationRecord {
  const issues: string[] = [];
  if (!draft.canonicalName.trim()) issues.push("empty_name");
  if (!draft.description.trim()) issues.push("empty_description");
  if (draft.citations.some((citation) => !citation.blockId || !citation.exactQuote.trim())) {
    issues.push("invalid_citation");
  }
  if (issues.length) {
    return record("schema_validity", "fail", "blocking", "Knowledge candidate schema is invalid.", { issues });
  }
  return record("schema_validity", "pass", "info", "Knowledge candidate schema is valid.");
}

function sourceExists(snapshotExists: boolean): ValidationRecord {
  if (!snapshotExists) {
    return record("source_exists", "fail", "blocking", "Source snapshot was not found in the workspace.");
  }
  return record("source_exists", "pass", "info", "Source snapshot exists.");
}

function blockExists(
  draft: KnowledgeCandidateDraft,
  blocksById: Map<string, KnowledgeCitedBlock>,
): ValidationRecord {
  const missing = draft.citations.filter((citation) => !blocksById.has(citation.blockId)).map((c) => c.blockId);
  if (missing.length > 0) {
    return record("block_exists", "fail", "blocking", "Citation refers to an unknown block.", { missing });
  }
  return record("block_exists", "pass", "info", "Cited blocks exist.");
}

function citationExists(draft: KnowledgeCandidateDraft): ValidationRecord {
  if (draft.citations.length === 0) {
    return record("citation_exists", "fail", "blocking", "Knowledge candidate has no citations.");
  }
  return record("citation_exists", "pass", "info", "Citations are present.");
}

function quoteIntegrity(
  draft: KnowledgeCandidateDraft,
  blocksById: Map<string, KnowledgeCitedBlock>,
): ValidationRecord {
  const failures: string[] = [];
  let ambiguous = false;
  for (const citation of draft.citations) {
    const block = blocksById.get(citation.blockId);
    if (!block) continue;
    const location = locateExactQuote(block.textContent, citation.exactQuote);
    if (!location.found) failures.push(citation.blockId);
    if (location.ambiguous) ambiguous = true;
  }
  if (failures.length > 0) {
    return record("quote_integrity", "fail", "blocking", "exact_quote does not occur in the cited block.", {
      failures,
    });
  }
  if (ambiguous) {
    return record(
      "quote_integrity",
      "warn",
      "review",
      "exact_quote occurs more than once; offsets were not invented.",
      { ambiguous: true },
    );
  }
  return record("quote_integrity", "pass", "info", "exact_quote occurs uniquely in the cited block.");
}

function objectTypeAllowed(draft: KnowledgeCandidateDraft): ValidationRecord {
  if (!KNOWLEDGE_OBJECT_TYPES.includes(draft.objectType as never)) {
    return record("object_type_allowed", "fail", "blocking", "object_type is not in the closed enum.");
  }
  return record("object_type_allowed", "pass", "info", "object_type is allowed.");
}

function canonicalNamePresent(draft: KnowledgeCandidateDraft): ValidationRecord {
  if (!draft.canonicalName.trim()) {
    return record("canonical_name_present", "fail", "blocking", "canonical_name is empty.");
  }
  return record("canonical_name_present", "pass", "info", "canonical_name is present.");
}

function duplicateDetection(draft: KnowledgeCandidateDraft, existingObjectNames: string[]): ValidationRecord {
  const close = existingObjectNames.filter((name) => {
    const left = name.toLowerCase();
    const right = draft.canonicalName.toLowerCase();
    return left !== right && (left.includes(right) || right.includes(left));
  });
  if (close.length > 0) {
    return record(
      "duplicate_detection",
      "warn",
      "review",
      "A similar knowledge object already exists; automatic merge was not performed.",
      { similar: close },
    );
  }
  return record("duplicate_detection", "pass", "info", "No conflicting near-duplicate name detected.");
}

function taxonomyMappingValidity(draft: KnowledgeCandidateDraft): ValidationRecord {
  if (draft.tags.length === 0) {
    return record("taxonomy_mapping_validity", "pass", "info", "No tags proposed.");
  }
  const unmapped = draft.tags.filter((tag) => !mapSuggestedTag(tag.category, tag.name).ok);
  if (unmapped.length > 0) {
    return record(
      "taxonomy_mapping_validity",
      "warn",
      "review",
      "One or more proposed tags could not be mapped to the controlled taxonomy.",
      { unmapped },
    );
  }
  return record("taxonomy_mapping_validity", "pass", "info", "Proposed tags map to canonical taxonomy values.");
}

export function hasBlockingKnowledgeFailure(records: ValidationRecord[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}
