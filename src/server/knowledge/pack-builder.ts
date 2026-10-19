import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CANONICAL_BUSINESS_PROBLEMS,
  CANONICAL_CAPABILITIES,
  CANONICAL_INDUSTRIES,
  CANONICAL_METHODOLOGIES,
  ENGAGEMENT_STAGES,
  INDUSTRY_SUBSEGMENTS,
  SERVICE_FAMILIES,
  TRANSFORMATION_DIMENSIONS,
} from "./canonical-taxonomy";
import {
  CATALOG_SOURCE_ID,
  EXPECTED_PRIVATE_SOURCES,
  OFFICIAL_EFESO_PAGES,
  checkEfesoKnowledgeSources,
  loadOfficialWebsiteSnapshots,
} from "./efeso-knowledge-sources";
import { buildSourcedKnowledgeObjects } from "./sourced-pack";
import { normalizeKnowledgeName } from "./taxonomy";
import type { KnowledgePack, KnowledgePackObject, SourceManifestEntry } from "./pack-schema";

function slug(value: string): string {
  return normalizeKnowledgeName(value).replace(/\s+/g, "-");
}

function catalogObject(
  partial: Omit<KnowledgePackObject, "source_references" | "origin" | "client_attribution" | "relations"> &
    Partial<Pick<KnowledgePackObject, "source_references" | "origin" | "client_attribution" | "relations">>,
): KnowledgePackObject {
  return {
    source_references: [{ source_id: CATALOG_SOURCE_ID, locator: "docs/EFESO_KNOWLEDGE_TAXONOMY.md" }],
    origin: "curated_internal",
    client_attribution: "none",
    ...partial,
    relations: partial.relations ?? [],
  };
}

export function buildSourceManifest(rootDir?: string): { version: string; sources: SourceManifestEntry[] } {
  const privatePresent = new Set(
    rootDir && existsSync(join(rootDir, "private/efeso-knowledge-sources"))
      ? checkEfesoKnowledgeSources(rootDir).present.map((row) => row.sourceId)
      : [],
  );
  const snapshots = rootDir ? loadOfficialWebsiteSnapshots(rootDir) : null;
  const snapshotById = new Map((snapshots?.pages ?? []).map((page) => [page.source_id, page]));

  const privateSources: SourceManifestEntry[] = EXPECTED_PRIVATE_SOURCES.map((source) => ({
    source_id: source.sourceId,
    filename: source.filename,
    url: null,
    source_document_type: source.sourceDocumentType,
    publication_date: source.publicationDate,
    effective_date: source.effectiveDate,
    visibility_level: source.visibilityLevel,
    confidentiality_level: source.confidentialityLevel,
    contains_commercial_terms: source.containsCommercialTerms,
    contains_personal_contacts: source.containsPersonalContacts,
    contains_client_specific_information: source.containsClientSpecificInformation,
    approved_for_global_knowledge: source.approvedForGlobalKnowledge,
    approved_for_matching: source.approvedForMatching,
    approved_for_member_display: source.approvedForMemberDisplay,
    fetch_status: privatePresent.has(source.sourceId) ? "present_in_repo" : "pending_private_file",
  }));

  const official: SourceManifestEntry[] = OFFICIAL_EFESO_PAGES.map((page) => {
    const snapshot = snapshotById.get(page.sourceId);
    return {
      source_id: page.sourceId,
      filename: null,
      url: snapshot?.final_url ?? page.url,
      source_document_type: "official_website" as const,
      publication_date: snapshot ? snapshot.fetched_at.slice(0, 10) : null,
      effective_date: snapshot ? snapshot.fetched_at.slice(0, 10) : null,
      visibility_level: "public" as const,
      confidentiality_level: "public" as const,
      contains_commercial_terms: false,
      contains_personal_contacts: false,
      contains_client_specific_information: false,
      approved_for_global_knowledge: true,
      approved_for_matching: true,
      approved_for_member_display: true,
      fetch_status: snapshot ? "captured" : "pending_official_snapshot",
      title: snapshot?.title ?? null,
      fetched_at: snapshot?.fetched_at ?? null,
      content_hash: snapshot?.content_hash ?? null,
    };
  });

  const catalog: SourceManifestEntry = {
    source_id: CATALOG_SOURCE_ID,
    filename: "docs/EFESO_KNOWLEDGE_TAXONOMY.md",
    url: null,
    source_document_type: "canonical_taxonomy",
    publication_date: "2026-10-18",
    effective_date: "2026-10-18",
    visibility_level: "efeso_member",
    confidentiality_level: "internal",
    contains_commercial_terms: false,
    contains_personal_contacts: false,
    contains_client_specific_information: false,
    approved_for_global_knowledge: true,
    approved_for_matching: true,
    approved_for_member_display: true,
    fetch_status: "canonical_catalog",
  };

  return { version: "v1", sources: [catalog, ...official, ...privateSources] };
}

export function buildCanonicalKnowledgePack(): KnowledgePack {
  const objects: KnowledgePackObject[] = [];

  for (const family of SERVICE_FAMILIES) {
    objects.push(
      catalogObject({
        stable_key: `service.${slug(family)}`,
        canonical_name: family,
        object_type: "service",
        knowledge_nature: "institutional_fact",
        outcome_status: "not_applicable",
        description: `${family} is a canonical EFESO service family in the governed knowledge catalog.`,
        service_families: [family],
        capabilities: CANONICAL_CAPABILITIES.filter((row) => row.serviceFamily === family).map((row) => row.name),
        methods: [],
        business_problems: [],
        industries: [],
        dimensions: [],
        engagement_stages: [],
        aliases: [],
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "what_we_do",
      }),
    );
  }

  for (const capability of CANONICAL_CAPABILITIES) {
    objects.push(
      catalogObject({
        stable_key: `capability.${slug(capability.name)}`,
        canonical_name: capability.name,
        object_type: "capability",
        knowledge_nature: "reusable_methodology",
        outcome_status: "not_applicable",
        description: capability.description,
        service_families: [capability.serviceFamily],
        capabilities: [capability.name],
        methods: capability.methods,
        business_problems: capability.problems,
        industries: capability.industries,
        dimensions: [...capability.dimensions],
        engagement_stages: [...capability.stages],
        aliases: capability.aliases,
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "what_we_do",
        relations: [
          {
            target_stable_key: `service.${slug(capability.serviceFamily)}`,
            relation_type: "supports_service",
          },
          ...capability.methods.map((method) => ({
            target_stable_key: `methodology.${slug(method)}`,
            relation_type: "uses_methodology",
          })),
          ...capability.problems.map((problem) => ({
            target_stable_key: `problem.${slug(problem)}`,
            relation_type: "addresses_problem",
          })),
        ],
      }),
    );
  }

  for (const method of CANONICAL_METHODOLOGIES) {
    objects.push(
      catalogObject({
        stable_key: `methodology.${slug(method.name)}`,
        canonical_name: method.name,
        object_type: "methodology",
        knowledge_nature: "reusable_methodology",
        outcome_status: "not_applicable",
        description: method.description,
        service_families: [],
        capabilities: CANONICAL_CAPABILITIES.filter((row) => row.methods.includes(method.name)).map((row) => row.name),
        methods: [method.name],
        business_problems: [],
        industries: [],
        dimensions: [],
        engagement_stages: [],
        aliases: method.aliases,
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "how_we_work",
      }),
    );
  }

  for (const problem of CANONICAL_BUSINESS_PROBLEMS) {
    objects.push(
      catalogObject({
        stable_key: `problem.${slug(problem.name)}`,
        canonical_name: problem.name,
        object_type: "concept",
        knowledge_nature: "institutional_fact",
        outcome_status: "not_applicable",
        description: `Controlled business-problem term: ${problem.name}.`,
        service_families: [],
        capabilities: CANONICAL_CAPABILITIES.filter((row) => row.problems.includes(problem.name)).map((row) => row.name),
        methods: [],
        business_problems: [problem.name],
        industries: [],
        dimensions: [],
        engagement_stages: [],
        aliases: [...problem.aliases],
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "problems_we_solve",
      }),
    );
  }

  for (const industry of CANONICAL_INDUSTRIES) {
    objects.push(
      catalogObject({
        stable_key: `industry.${slug(industry)}`,
        canonical_name: industry,
        object_type: "industry_expertise",
        knowledge_nature: "institutional_fact",
        outcome_status: "not_applicable",
        description: `${industry} is a canonical industry in the EFESO knowledge catalog.`,
        service_families: [],
        capabilities: [],
        methods: [],
        business_problems: [],
        industries: [industry],
        dimensions: [],
        engagement_stages: [],
        aliases: [],
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "industries",
      }),
    );
  }

  for (const subsegment of INDUSTRY_SUBSEGMENTS) {
    objects.push(
      catalogObject({
        stable_key: `subsegment.${slug(subsegment.name)}`,
        canonical_name: subsegment.name,
        object_type: "industry_expertise",
        knowledge_nature: "institutional_fact",
        outcome_status: "not_applicable",
        description: `${subsegment.name} is a subsegment of ${subsegment.parent}.`,
        service_families: [],
        capabilities: [],
        methods: [],
        business_problems: [],
        industries: [subsegment.parent],
        dimensions: [],
        engagement_stages: [],
        aliases: [],
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "industries",
        relations: [
          {
            target_stable_key: `industry.${slug(subsegment.parent)}`,
            relation_type: "part_of",
          },
        ],
      }),
    );
  }

  for (const dimension of TRANSFORMATION_DIMENSIONS) {
    objects.push(
      catalogObject({
        stable_key: `dimension.${slug(dimension)}`,
        canonical_name: dimension,
        object_type: "concept",
        knowledge_nature: "institutional_fact",
        outcome_status: "not_applicable",
        description: `${dimension} is a canonical transformation dimension.`,
        service_families: [],
        capabilities: [],
        methods: [],
        business_problems: [],
        industries: [],
        dimensions: [dimension],
        engagement_stages: [],
        aliases: [],
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "how_we_work",
      }),
    );
  }

  for (const stage of ENGAGEMENT_STAGES) {
    objects.push(
      catalogObject({
        stable_key: `stage.${slug(stage)}`,
        canonical_name: stage,
        object_type: "concept",
        knowledge_nature: "institutional_fact",
        outcome_status: "not_applicable",
        description: `${stage} is a canonical engagement stage.`,
        service_families: [],
        capabilities: [],
        methods: [],
        business_problems: [],
        industries: [],
        dimensions: [],
        engagement_stages: [stage],
        aliases: [],
        visibility_level: "efeso_member",
        confidentiality_level: "internal",
        approved_for_matching: true,
        approved_for_display: true,
        catalog_section: "how_we_work",
      }),
    );
  }

  return {
    pack_id: "efeso-knowledge-pack.v1",
    version: "v1",
    generated_from: "canonical-taxonomy",
    objects,
  };
}

export function buildEfesoKnowledgePack(): KnowledgePack {
  const catalog = buildCanonicalKnowledgePack();
  return {
    pack_id: "efeso-knowledge-pack.v1",
    version: "v1",
    generated_from: "canonical-taxonomy+official-website+curated-private-sources",
    objects: [...catalog.objects, ...buildSourcedKnowledgeObjects()],
  };
}

export function knowledgePackContentHash(pack: KnowledgePack): string {
  const payload = JSON.stringify(pack.objects.map((row) => ({ key: row.stable_key, description: row.description, aliases: row.aliases })));
  let hash = 0;
  for (let index = 0; index < payload.length; index += 1) {
    hash = (hash * 31 + payload.charCodeAt(index)) | 0;
  }
  return `pack-v1-${Math.abs(hash).toString(16)}`;
}
