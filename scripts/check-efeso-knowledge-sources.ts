import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEfesoKnowledgeSources } from "../src/server/knowledge/efeso-knowledge-sources";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = checkEfesoKnowledgeSources(root);

console.log("EFESO knowledge source pre-flight");
console.log(`directory=${result.directory}`);
console.log(`present=${result.present.length}`);
for (const row of result.present) {
  console.log(`PRESENT ${row.filename}`);
}
console.log(`missing=${result.missing.length}`);
for (const row of result.missing) {
  console.log(`MISSING ${row.filename}`);
}
console.log(`duplicates=${result.duplicates.length}`);
for (const row of result.duplicates) {
  console.log(`DUPLICATE ${row.normalized} -> ${row.files.join(" | ")}`);
}
console.log(`unexpected=${result.unexpected.length}`);
for (const name of result.unexpected) {
  console.log(`UNEXPECTED ${name}`);
}

if (!result.complete) {
  console.error("SOURCE PRE-FLIGHT: WAITING FOR FILES");
  process.exit(1);
}

console.log("SOURCE PRE-FLIGHT: COMPLETE");
