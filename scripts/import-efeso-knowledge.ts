import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sourceDocumentTypeForId } from "../src/server/knowledge/efeso-knowledge-sources";
import { formatImportReport, planKnowledgePackImport } from "../src/server/knowledge/import-pack";
import { normalizeKnowledgeName } from "../src/server/knowledge/taxonomy";
import type { KnowledgePackObject } from "../src/server/knowledge/pack-schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const plan = planKnowledgePackImport(root);

if (plan.issues.length > 0) {
  console.error(formatImportReport({ dryRun, ...plan }));
  process.exit(1);
}

if (dryRun) {
  console.log(formatImportReport({ dryRun: true, ...plan }));
  process.exit(0);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function objectHash(object: KnowledgePackObject): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        canonical_name: object.canonical_name,
        description: object.description,
        aliases: object.aliases,
        nature: object.knowledge_nature,
        outcome: object.outcome_status,
        visibility: object.visibility_level,
        tags: {
          families: object.service_families,
          methods: object.methods,
          problems: object.business_problems,
          industries: object.industries,
        },
      }),
    )
    .digest("hex");
}

function asError(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

async function upsertTag(
  admin: SupabaseClient,
  category: string,
  canonicalName: string,
  cache: Map<string, string>,
): Promise<string> {
  const key = `${category}:${canonicalName}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const normalized = normalizeKnowledgeName(canonicalName);
  const { data: existing, error: lookupError } = await admin
    .from("knowledge_tags")
    .select("id")
    .eq("category", category)
    .eq("normalized_name", normalized)
    .maybeSingle();
  asError(lookupError);
  if (existing?.id) {
    cache.set(key, existing.id);
    return existing.id;
  }
  const { data, error } = await admin
    .from("knowledge_tags")
    .insert({ category, canonical_name: canonicalName, normalized_name: normalized })
    .select("id")
    .single();
  asError(error);
  cache.set(key, data.id);
  return data.id;
}

async function main() {
  const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", "efeso-brazil")
    .maybeSingle();
  asError(workspaceError);
  if (!workspace) throw new Error("Workspace efeso-brazil is missing.");

  const packHash = createHash("sha256").update(JSON.stringify(plan.pack)).digest("hex");
  const catalogUrl = "signal://efeso/knowledge-pack";
  const existingSource = await admin
    .from("sources")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("canonical_url", catalogUrl)
    .maybeSingle();
  asError(existingSource.error);
  let sourceId = existingSource.data?.id as string | undefined;
  if (!sourceId) {
    const created = await admin
      .from("sources")
      .insert({
        workspace_id: workspace.id,
        canonical_url: catalogUrl,
        domain: "efeso.com",
        publisher_name: "EFESO",
        source_type: "internal_efeso",
        source_tier: "A",
        access_type: "workspace_internal",
        language_code: "en",
        country_code: "BR",
      })
      .select("id")
      .single();
    asError(created.error);
    sourceId = created.data.id;
  }

  const snapshotLookup = await admin
    .from("source_snapshots")
    .select("id")
    .eq("source_id", sourceId)
    .eq("content_hash", packHash)
    .maybeSingle();
  asError(snapshotLookup.error);
  let snapshotId = snapshotLookup.data?.id as string | undefined;
  if (!snapshotId) {
    const created = await admin
      .from("source_snapshots")
      .insert({
        workspace_id: workspace.id,
        source_id: sourceId,
        title: "EFESO knowledge pack v1",
        content_hash: packHash,
        snapshot_mode: "metadata_only",
        language_code: "en",
        normalized_text: "EFESO knowledge pack v1 canonical taxonomy catalog.",
        metadata: { pack_id: plan.pack.pack_id },
      })
      .select("id")
      .single();
    asError(created.error);
    snapshotId = created.data.id;
  }

  const blockLookup = await admin
    .from("source_content_blocks")
    .select("id")
    .eq("source_snapshot_id", snapshotId)
    .eq("block_index", 0)
    .maybeSingle();
  asError(blockLookup.error);
  let blockId = blockLookup.data?.id as string | undefined;
  if (!blockId) {
    const created = await admin
      .from("source_content_blocks")
      .insert({
        workspace_id: workspace.id,
        source_snapshot_id: snapshotId,
        block_index: 0,
        block_type: "paragraph",
        text_content: "EFESO knowledge pack v1 canonical taxonomy catalog.",
        content_hash: packHash,
        parser_name: "efeso-knowledge-pack",
        parser_version: "v1",
      })
      .select("id")
      .single();
    asError(created.error);
    blockId = created.data.id;
  }

  const tagCache = new Map<string, string>();
  const idByKey = new Map<string, string>();
  let imported = 0;
  let versioned = 0;
  let unchanged = 0;

  const existingCatalog = await admin
    .from("efeso_knowledge_objects")
    .select("id, status, metadata, canonical_name, object_type")
    .eq("workspace_id", workspace.id);
  asError(existingCatalog.error);

  for (const object of plan.pack.objects) {
    const hash = objectHash(object);
    const current = (existingCatalog.data ?? []).find(
      (row) => (row.metadata as { stable_key?: string } | null)?.stable_key === object.stable_key && row.status !== "archived",
    );
    if (current && (current.metadata as { content_hash?: string }).content_hash === hash) {
      unchanged += 1;
      idByKey.set(object.stable_key, current.id);
      continue;
    }
    if (current) {
      const archived = await admin
        .from("efeso_knowledge_objects")
        .update({ status: "archived" })
        .eq("id", current.id)
        .eq("workspace_id", workspace.id);
      asError(archived.error);
      versioned += 1;
    }
    const inserted = await admin
      .from("efeso_knowledge_objects")
      .insert({
        workspace_id: workspace.id,
        object_type: object.object_type,
        canonical_name: object.canonical_name,
        normalized_name: normalizeKnowledgeName(object.canonical_name),
        short_description: object.description,
        status: "active",
        source_snapshot_id: snapshotId,
        primary_content_block_id: blockId,
        stable_key: object.stable_key,
        knowledge_nature: object.knowledge_nature,
        outcome_status: object.outcome_status,
        visibility_level: object.visibility_level,
        confidentiality_level: object.confidentiality_level,
        client_attribution: object.client_attribution,
        source_document_type: sourceDocumentTypeForId(object.source_references[0]?.source_id ?? "canonical-taxonomy-v1"),
        approved_for_matching: object.approved_for_matching,
        approved_for_display: object.approved_for_display,
        commercial_terms_present: false,
        supersedes_object_id: current?.id ?? null,
        metadata: {
          origin: object.origin,
          stable_key: object.stable_key,
          content_hash: hash,
          catalog_section: object.catalog_section,
          pack_id: plan.pack.pack_id,
        },
      })
      .select("id")
      .single();
    asError(inserted.error);
    imported += 1;
    idByKey.set(object.stable_key, inserted.data.id);

    const aliasValues = [...new Set([object.canonical_name, ...object.aliases])];
    for (const alias of aliasValues) {
      const normalized = normalizeKnowledgeName(alias);
      const aliasInsert = await admin.from("knowledge_object_aliases").insert({
        workspace_id: workspace.id,
        knowledge_object_id: inserted.data.id,
        alias,
        normalized_alias: normalized,
        source_snapshot_id: snapshotId,
      });
      if (aliasInsert.error && aliasInsert.error.code !== "23505") throw aliasInsert.error;
    }

    const tagPairs: { category: string; name: string }[] = [
      ...object.service_families.map((name) => ({ category: "SERVICE_FAMILY", name })),
      ...object.capabilities.map((name) => ({ category: "CAPABILITY_DOMAIN", name })),
      ...object.methods.map((name) => ({ category: "METHODOLOGY", name })),
      ...object.business_problems.map((name) => ({ category: "BUSINESS_PROBLEM", name })),
      ...object.industries.map((name) => ({ category: "INDUSTRY", name })),
      ...object.dimensions.map((name) => ({ category: "TRANSFORMATION_DIMENSION", name })),
      ...object.engagement_stages.map((name) => ({ category: "ENGAGEMENT_STAGE", name })),
    ];
    for (const tag of tagPairs) {
      const tagId = await upsertTag(admin, tag.category, tag.name, tagCache);
      const tagInsert = await admin.from("knowledge_object_tags").insert({
        workspace_id: workspace.id,
        knowledge_object_id: inserted.data.id,
        tag_id: tagId,
      });
      if (tagInsert.error && tagInsert.error.code !== "23505") throw tagInsert.error;
    }
  }

  for (const object of plan.pack.objects) {
    const sourceIdObj = idByKey.get(object.stable_key);
    if (!sourceIdObj) continue;
    for (const relation of object.relations) {
      const targetId = idByKey.get(relation.target_stable_key);
      if (!targetId) continue;
      const relInsert = await admin.from("knowledge_object_relations").insert({
        workspace_id: workspace.id,
        source_object_id: sourceIdObj,
        target_object_id: targetId,
        relation_type: relation.relation_type,
        source_snapshot_id: snapshotId,
        status: "active",
      });
      if (relInsert.error && relInsert.error.code !== "23505") throw relInsert.error;
    }
  }

  const demoRows = (existingCatalog.data ?? []).filter(
    (row) => (row.metadata as { origin?: string } | null)?.origin === "demo_seed" && row.status === "active",
  );
  let archivedDemo = 0;
  if (imported + unchanged > 0 && demoRows.length > 0) {
    const archived = await admin
      .from("efeso_knowledge_objects")
      .update({ status: "archived" })
      .eq("workspace_id", workspace.id)
      .contains("metadata", { origin: "demo_seed" })
      .eq("status", "active");
    asError(archived.error);
    archivedDemo = demoRows.length;
  }

  console.log(
    formatImportReport({
      dryRun: false,
      ...plan,
      imported,
      versioned,
      unchanged,
      archivedDemo,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
