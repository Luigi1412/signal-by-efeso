import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OFFICIAL_EFESO_PAGES, OFFICIAL_SNAPSHOTS_RELATIVE_PATH } from "../src/server/knowledge/efeso-knowledge-sources";
import { safeFetch } from "../src/server/external-research/fetch-safe";
import { extractHtmlText } from "../src/server/external-research/html";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fetchedAt = new Date().toISOString();

async function lookup(hostname: string): Promise<string[]> {
  const [v4, v6] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
  return [
    ...(v4.status === "fulfilled" ? v4.value : []),
    ...(v6.status === "fulfilled" ? v6.value : []),
  ];
}

const fetchImpl: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("User-Agent", "SignalKnowledgeSnapshot/1.0 (+https://www.efeso.com)");
  headers.set("Accept-Language", "en");
  return fetch(input, { ...init, headers });
};

async function main() {
  const pages = [];
  for (const page of OFFICIAL_EFESO_PAGES) {
    const result = await safeFetch({
      url: page.url,
      fetchImpl,
      lookup,
      timeoutMs: 30_000,
      maxBytes: 4 * 1024 * 1024,
    });
    const html = new TextDecoder().decode(result.bytes);
    const extracted = extractHtmlText(html);
    const text = extracted.text;
    const contentHash = createHash("sha256").update(text).digest("hex");
    pages.push({
      source_id: page.sourceId,
      slug: page.slug,
      url: page.url,
      final_url: result.url,
      title: extracted.title,
      fetched_at: fetchedAt,
      content_hash: contentHash,
      mime_type: result.mimeType,
      byte_length: result.bytes.byteLength,
      char_count: text.length,
      excerpt: text.slice(0, 20_000),
    });
    console.log(
      `${page.sourceId} ${result.status} ${contentHash.slice(0, 12)} ${extracted.title ?? "(no title)"} chars=${text.length}`,
    );
  }

  const payload = {
    version: "v1",
    fetched_at: fetchedAt,
    source_type: "official_website",
    pages,
  };

  const out = join(root, OFFICIAL_SNAPSHOTS_RELATIVE_PATH);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote ${pages.length} official snapshots to ${OFFICIAL_SNAPSHOTS_RELATIVE_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
