import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkEfesoKnowledgeSources } from "../src/server/knowledge/efeso-knowledge-sources";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/tmp/efeso-knowledge-extract";
mkdirSync(outDir, { recursive: true });

const preflight = checkEfesoKnowledgeSources(root);
if (!preflight.complete) {
  throw new Error(`Private sources incomplete: present=${preflight.present.length} missing=${preflight.missing.length}`);
}

function safeOutName(filename: string): string {
  return filename.replace(/[\\/]/g, "_");
}

function extractPptx(filePath: string): string {
  const script = `
import zipfile, re, sys
path = sys.argv[1]
texts = []
with zipfile.ZipFile(path) as archive:
    names = sorted(n for n in archive.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml") and "/_rels/" not in n)
    for name in names:
        xml = archive.read(name).decode("utf-8", errors="ignore")
        parts = re.findall(r"<a:t[^>]*>([^<]*)</a:t>", xml)
        texts.append(" ".join(parts))
print("\\n\\n---SLIDE---\\n\\n".join(texts))
`;
  const result = spawnSync("python3", ["-c", script, filePath], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`pptx extract failed for ${basename(filePath)}: ${result.stderr}`);
  }
  return result.stdout;
}

async function extractPdf(filePath: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: true });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item) => ("str" in item ? String(item.str) : "")).filter(Boolean);
    pages.push(`---PAGE ${pageNumber}---\n${strings.join(" ")}`);
  }
  return pages.join("\n\n");
}

function extractEml(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

const KEYWORDS = [
  "62",
  "19.8",
  "19,8",
  "40 million",
  "40 milh",
  "PKE",
  "Bioenerg",
  "Home Care",
  "homecare",
  "delivered",
  "resultado",
  "Forbes",
  "1500",
  "1,500",
  "Sif",
  "Mining",
  "PrimeTwin",
  "AutoStore",
  "GDD",
  "SIPOC",
  "Makigami",
  "WCOM",
  "BOOST",
  "OEE",
  "TPM",
  "ABCX",
  "S&OP",
  "Control Tower",
  "Lean",
];

async function main() {
  const hits: string[] = [];

  for (const source of preflight.present) {
    const filePath = join(root, "private/efeso-knowledge-sources", source.matchedFile);
    const ext = extname(source.matchedFile).toLowerCase();
    let text = "";
    if (ext === ".pptx") text = extractPptx(filePath);
    else if (ext === ".pdf") text = await extractPdf(filePath);
    else if (ext === ".eml") text = extractEml(filePath);
    else throw new Error(`Unsupported extension ${ext}`);

    const outFile = join(outDir, `${safeOutName(source.matchedFile)}.txt`);
    writeFileSync(outFile, text);
    console.log(`extracted ${source.sourceId} chars=${text.length}`);

    const lines = text.split(/\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()))) {
        const snippet = line.replace(/\s+/g, " ").trim().slice(0, 280);
        hits.push(`${source.sourceId}\tL${index + 1}\t${snippet}`);
      }
    }
  }

  writeFileSync(join(outDir, "hits.tsv"), `${hits.join("\n")}\n`);
  console.log(`wrote ${hits.length} keyword hits to ${outDir}/hits.tsv`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
