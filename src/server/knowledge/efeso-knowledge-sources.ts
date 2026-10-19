import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const EFESO_KNOWLEDGE_SOURCES_DIR = "private/efeso-knowledge-sources";

export const SOURCE_DOCUMENT_TYPES = [
  "official_website",
  "institutional_deck",
  "public_case",
  "commercial_proposal",
  "prime_twin_report",
  "internal_email",
  "internal_case_material",
  "canonical_taxonomy",
] as const;

export type SourceDocumentType = (typeof SOURCE_DOCUMENT_TYPES)[number];

export interface ExpectedKnowledgeSource {
  sourceId: string;
  filename: string;
  sourceDocumentType: SourceDocumentType;
  publicationDate: string | null;
  effectiveDate: string | null;
  visibilityLevel: "public" | "efeso_member" | "restricted_account_team" | "admin_only";
  confidentialityLevel: "public" | "internal" | "confidential" | "highly_confidential";
  containsCommercialTerms: boolean;
  containsPersonalContacts: boolean;
  containsClientSpecificInformation: boolean;
  approvedForGlobalKnowledge: boolean;
  approvedForMatching: boolean;
  approvedForMemberDisplay: boolean;
  clientAttribution: "none" | "named" | "anonymized";
}

/** Filenames from the Sprint 10.6 source list. Matching is Unicode-normalized. */
export const EXPECTED_PRIVATE_SOURCES: ExpectedKnowledgeSource[] = [
  {
    sourceId: "src-about-efeso-latam",
    filename: "About EFESO_LATAM.pptx",
    sourceDocumentType: "institutional_deck",
    publicationDate: null,
    effectiveDate: null,
    visibilityLevel: "efeso_member",
    confidentialityLevel: "internal",
    containsCommercialTerms: false,
    containsPersonalContacts: false,
    containsClientSpecificInformation: false,
    approvedForGlobalKnowledge: true,
    approvedForMatching: true,
    approvedForMemberDisplay: true,
    clientAttribution: "none",
  },
  {
    sourceId: "src-efeso-latam-institucional-2026",
    filename: "EFESO LATAM Institucional_2026.pptx",
    sourceDocumentType: "institutional_deck",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "efeso_member",
    confidentialityLevel: "internal",
    containsCommercialTerms: false,
    containsPersonalContacts: false,
    containsClientSpecificInformation: false,
    approvedForGlobalKnowledge: true,
    approvedForMatching: true,
    approvedForMemberDisplay: true,
    clientAttribution: "none",
  },
  {
    sourceId: "src-primetwin-salus-biomedical",
    filename: "Salus Biomedical.eml",
    sourceDocumentType: "prime_twin_report",
    publicationDate: null,
    effectiveDate: null,
    visibilityLevel: "admin_only",
    confidentialityLevel: "confidential",
    containsCommercialTerms: false,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: false,
    approvedForMemberDisplay: false,
    clientAttribution: "anonymized",
  },
  {
    sourceId: "src-primetwin-aldebras",
    filename: "Aldebras report.eml",
    sourceDocumentType: "prime_twin_report",
    publicationDate: null,
    effectiveDate: null,
    visibilityLevel: "admin_only",
    confidentialityLevel: "confidential",
    containsCommercialTerms: false,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: false,
    approvedForMemberDisplay: false,
    clientAttribution: "anonymized",
  },
  {
    sourceId: "src-primetwin-nobelpack",
    filename: "Nobelpack Report.eml",
    sourceDocumentType: "prime_twin_report",
    publicationDate: null,
    effectiveDate: null,
    visibilityLevel: "admin_only",
    confidentialityLevel: "confidential",
    containsCommercialTerms: false,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: false,
    approvedForMemberDisplay: false,
    clientAttribution: "anonymized",
  },
  {
    sourceId: "src-primetwin-consulting-report-service",
    filename: "PrimeTwin Consulting Report Service for Countries.eml",
    sourceDocumentType: "prime_twin_report",
    publicationDate: null,
    effectiveDate: null,
    visibilityLevel: "admin_only",
    confidentialityLevel: "internal",
    containsCommercialTerms: false,
    containsPersonalContacts: true,
    containsClientSpecificInformation: false,
    approvedForGlobalKnowledge: false,
    approvedForMatching: false,
    approvedForMemberDisplay: false,
    clientAttribution: "none",
  },
  {
    sourceId: "src-proposta-126-2026-coamo-implementacao",
    filename:
      "Proposta 126-2026 - Coamo_Consultoria e Implementação com consultor full time do Modelo de Gestão do Almoxarifado de Peças de Reposição.pdf",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-124-2026-coamo-projeto",
    filename:
      "Proposta 124-2026 - Coamo_Consultoria para o Projeto do Modelo de Gestão do Almoxarifado de Peças de Reposição.pdf",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-130-2026-koppert-gdd",
    filename: "Proposta 130-2026 - Koppert_Implementação do GDD.pdf",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-2026-br0112-luxottica-sumare",
    filename: "2026-BR0112_Luxottica Sumaré_ Excelência Operacional na Fábrica de Lentes Oftalmológicas.pdf",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-2026-br0111-eurofarma-ia",
    filename: "2026-BR0111_Eurofarma_Transformação Digital com IA Operações_rev3_Técnica.pdf",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-119-2026-koppert-ps",
    filename: "Proposta 119-2026 - Koppert_Problem Solving Training.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-120-2026-koppert-ci",
    filename: "Proposta 120-2026 - Koppert_Support to the Continuous Improvement Team.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-2026-br0030-boehringer-pke",
    filename: "2026-BR0030_Boehringer_PKE Training_Garotti_TPFP.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2026-01-01",
    effectiveDate: "2026-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-034-2024-tirreno",
    filename: "Proposta 034-2024 - Tirreno_Mapeamento dos Processos Administrativos e análise de oportunidades.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2024-01-01",
    effectiveDate: "2024-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-sun-chemical-otd",
    filename: "Proposta Tecnica - Sun Chemical_Revisão do Modelo de Gestão do Ciclo do Pedido.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: null,
    effectiveDate: null,
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-091-2023-neodent-warehouse",
    filename: "Proposta 091-2023 - Neodent_Plano Estratégico Logístico novo Warehouse.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2023-01-01",
    effectiveDate: "2023-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-069-2022-neodent-materials",
    filename: "Proposta 069-2022 – Neodent_Excelência no Planejamento de Materiais.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2022-01-01",
    effectiveDate: "2022-01-01",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
  {
    sourceId: "src-proposta-033-2025-neodent-layout",
    filename: "Proposta 033-2025 - Neodent_250324 Neodent - Proposal Design and layout of WH_Rev1_Port.pptx",
    sourceDocumentType: "commercial_proposal",
    publicationDate: "2025-03-24",
    effectiveDate: "2025-03-24",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
    containsCommercialTerms: true,
    containsPersonalContacts: true,
    containsClientSpecificInformation: true,
    approvedForGlobalKnowledge: false,
    approvedForMatching: true,
    approvedForMemberDisplay: false,
    clientAttribution: "named",
  },
];

export const OFFICIAL_EFESO_PAGES = [
  {
    sourceId: "src-efeso-official-about-us",
    slug: "about-us",
    url: "https://www.efeso.com/about-us/",
    canonicalRole: "current public positioning, scale, and service spectrum",
  },
  {
    sourceId: "src-efeso-official-services",
    slug: "services",
    url: "https://www.efeso.com/services/",
    canonicalRole: "current public service families",
  },
  {
    sourceId: "src-efeso-official-industries",
    slug: "industries",
    url: "https://www.efeso.com/industries/",
    canonicalRole: "current public industry coverage",
  },
  {
    sourceId: "src-efeso-official-client-results",
    slug: "client-results",
    url: "https://www.efeso.com/client-results/",
    canonicalRole: "canonical public delivered results",
  },
  {
    sourceId: "src-efeso-official-awards-recognitions",
    slug: "awards-recognitions",
    url: "https://www.efeso.com/about-us/awards-recognition/",
    canonicalRole: "canonical public awards and recognitions",
  },
] as const;

export const OFFICIAL_SNAPSHOTS_RELATIVE_PATH = "data/efeso-knowledge/official-website-snapshots.json";
export const CATALOG_SOURCE_ID = "canonical-taxonomy-v1";

export interface OfficialWebsiteSnapshotPage {
  source_id: string;
  slug: string;
  url: string;
  final_url: string;
  title: string | null;
  fetched_at: string;
  content_hash: string;
  mime_type: string;
  byte_length: number;
  char_count: number;
  excerpt: string;
}

export interface OfficialWebsiteSnapshotsFile {
  version: string;
  fetched_at: string;
  source_type: string;
  pages: OfficialWebsiteSnapshotPage[];
}

export function loadOfficialWebsiteSnapshots(rootDir: string): OfficialWebsiteSnapshotsFile | null {
  const path = join(rootDir, OFFICIAL_SNAPSHOTS_RELATIVE_PATH);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as OfficialWebsiteSnapshotsFile;
}

export function sourceDocumentTypeForId(sourceId: string): SourceDocumentType {
  if (sourceId === CATALOG_SOURCE_ID) return "canonical_taxonomy";
  if (OFFICIAL_EFESO_PAGES.some((page) => page.sourceId === sourceId)) return "official_website";
  return EXPECTED_PRIVATE_SOURCES.find((source) => source.sourceId === sourceId)?.sourceDocumentType ?? "canonical_taxonomy";
}

const DASH_PATTERN = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

export function normalizeSourceFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(DASH_PATTERN, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface SourcePreflightResult {
  directory: string;
  present: { sourceId: string; filename: string; matchedFile: string }[];
  missing: { sourceId: string; filename: string }[];
  duplicates: { normalized: string; files: string[] }[];
  unexpected: string[];
  complete: boolean;
}

export function checkEfesoKnowledgeSources(rootDir: string): SourcePreflightResult {
  const directory = join(rootDir, EFESO_KNOWLEDGE_SOURCES_DIR);
  mkdirSync(directory, { recursive: true });

  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== ".gitkeep" && !entry.name.startsWith("."))
    .map((entry) => entry.name);

  const byNormalized = new Map<string, string[]>();
  for (const file of files) {
    const key = normalizeSourceFilename(file);
    const list = byNormalized.get(key) ?? [];
    list.push(file);
    byNormalized.set(key, list);
  }

  const present: SourcePreflightResult["present"] = [];
  const missing: SourcePreflightResult["missing"] = [];
  const matchedFiles = new Set<string>();

  for (const expected of EXPECTED_PRIVATE_SOURCES) {
    const key = normalizeSourceFilename(expected.filename);
    const matches = byNormalized.get(key) ?? [];
    if (matches.length === 0) {
      missing.push({ sourceId: expected.sourceId, filename: expected.filename });
      continue;
    }
    present.push({ sourceId: expected.sourceId, filename: expected.filename, matchedFile: matches[0] ?? expected.filename });
    for (const match of matches) matchedFiles.add(match);
  }

  const duplicates = [...byNormalized.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([normalized, names]) => ({ normalized, files: names }));

  const unexpected = files.filter((file) => !matchedFiles.has(file));

  return {
    directory,
    present,
    missing,
    duplicates,
    unexpected,
    complete: missing.length === 0,
  };
}
