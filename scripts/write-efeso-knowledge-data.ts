import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEfesoKnowledgeSources } from "../src/server/knowledge/efeso-knowledge-sources";
import { buildEfesoKnowledgePack, buildSourceManifest } from "../src/server/knowledge/pack-builder";
import { validateKnowledgePack } from "../src/server/knowledge/pack-schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "data/efeso-knowledge");
mkdirSync(dir, { recursive: true });

const preflight = checkEfesoKnowledgeSources(root);
if (!preflight.complete) {
  throw new Error(`Private sources incomplete: present=${preflight.present.length} missing=${preflight.missing.length}`);
}

const manifest = buildSourceManifest(root);
if (manifest.sources.some((row) => row.fetch_status === "pending_official_snapshot")) {
  throw new Error("Official EFESO website snapshots are missing. Run npx tsx scripts/snapshot-efeso-official.ts");
}
if (manifest.sources.some((row) => row.fetch_status === "pending_private_file")) {
  throw new Error("Private source files are still pending in the manifest.");
}

const pack = buildEfesoKnowledgePack();
const issues = validateKnowledgePack(pack, new Set(manifest.sources.map((row) => row.source_id)));
if (issues.length > 0) {
  console.error(issues);
  throw new Error("EFESO knowledge pack failed validation.");
}

writeFileSync(join(dir, "source-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(dir, "efeso-knowledge-pack.v1.json"), `${JSON.stringify(pack, null, 2)}\n`);
console.log(`wrote ${pack.objects.length} objects and ${manifest.sources.length} sources`);
