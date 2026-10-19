import { readFileSync } from "node:fs";
import { join } from "node:path";
import { knowledgePackSchema, sourceManifestEntrySchema, validateKnowledgePack, type KnowledgePack } from "./pack-schema";
import { z } from "zod";

const manifestFileSchema = z.object({
  version: z.string(),
  sources: z.array(sourceManifestEntrySchema).min(1),
});

export function loadKnowledgePackFile(rootDir: string): KnowledgePack {
  const raw = JSON.parse(readFileSync(join(rootDir, "data/efeso-knowledge/efeso-knowledge-pack.v1.json"), "utf8"));
  return knowledgePackSchema.parse(raw);
}

export function loadSourceManifestFile(rootDir: string) {
  const raw = JSON.parse(readFileSync(join(rootDir, "data/efeso-knowledge/source-manifest.json"), "utf8"));
  return manifestFileSchema.parse(raw);
}

export function planKnowledgePackImport(rootDir: string): {
  pack: KnowledgePack;
  sourceCount: number;
  objectCount: number;
  issues: { code: string; message: string; stableKey?: string }[];
  countsByType: Record<string, number>;
} {
  const pack = loadKnowledgePackFile(rootDir);
  const manifest = loadSourceManifestFile(rootDir);
  const sourceIds = new Set(manifest.sources.map((row) => row.source_id));
  const issues = validateKnowledgePack(pack, sourceIds);
  const countsByType: Record<string, number> = {};
  for (const object of pack.objects) {
    countsByType[object.object_type] = (countsByType[object.object_type] ?? 0) + 1;
  }
  return {
    pack,
    sourceCount: manifest.sources.length,
    objectCount: pack.objects.length,
    issues,
    countsByType,
  };
}

export function formatImportReport(input: {
  dryRun: boolean;
  objectCount: number;
  sourceCount: number;
  countsByType: Record<string, number>;
  issues: { code: string; message: string; stableKey?: string }[];
  imported?: number;
  versioned?: number;
  unchanged?: number;
  archivedDemo?: number;
}): string {
  const lines = [
    input.dryRun ? "EFESO knowledge import DRY-RUN" : "EFESO knowledge import",
    `sources=${input.sourceCount}`,
    `objects=${input.objectCount}`,
    `by_type=${JSON.stringify(input.countsByType)}`,
    `issues=${input.issues.length}`,
  ];
  if (!input.dryRun) {
    lines.push(`imported=${input.imported ?? 0}`);
    lines.push(`versioned=${input.versioned ?? 0}`);
    lines.push(`unchanged=${input.unchanged ?? 0}`);
    lines.push(`archived_demo=${input.archivedDemo ?? 0}`);
  }
  for (const issue of input.issues) {
    lines.push(`ISSUE ${issue.code} ${issue.stableKey ?? ""} ${issue.message}`.trim());
  }
  return lines.join("\n");
}
