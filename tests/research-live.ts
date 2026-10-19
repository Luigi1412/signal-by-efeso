/**
 * Live Tavily smoke test for Sprint 10 external research.
 * Does not run as part of npm run test:extraction.
 * Requires TAVILY_API_KEY. Does not print the key.
 * Does not call OpenAI / Claims / Signals.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assessSource } from "../src/server/external-research/quality";
import { PUBLIC_COMPANY_CATALOG } from "../src/server/external-research/catalog";
import { getExternalResearchProviderName, getTavilyApiKey } from "../src/server/external-research/config";
import { dedupeSources } from "../src/server/external-research/dedup";
import { generateResearchQueries } from "../src/server/external-research/queries";
import { TavilyExternalResearchProvider } from "../src/server/external-research/tavily-provider";
import { normalizeUrl } from "../src/server/external-research/normalize";
import type { DiscoveredSource } from "../src/server/external-research/types";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

function pickFixture() {
  const requested = process.env.RESEARCH_LIVE_COMPANY?.trim();
  if (requested) {
    const match = PUBLIC_COMPANY_CATALOG.find((row) => {
      const names = [row.canonicalName, ...row.aliases].map((name) => name.toLowerCase());
      return names.includes(requested.toLowerCase()) || row.canonicalName.toLowerCase().includes(requested.toLowerCase());
    });
    if (match) return match;
    return {
      canonicalName: requested,
      officialDomain: "",
      headquartersCountry: "",
      industry: "",
      aliases: [],
      decisionBasis: ["live fixture override"],
    };
  }
  return (
    PUBLIC_COMPANY_CATALOG.find((row) => row.canonicalName.toLowerCase().includes("umicore")) ??
    PUBLIC_COMPANY_CATALOG[0]
  );
}

async function main(): Promise<void> {
  if (!getTavilyApiKey()) {
    console.error("TAVILY_API_KEY is not configured. Live external research cannot run.");
    process.exit(2);
  }
  if (getExternalResearchProviderName() !== "tavily") {
    console.error(`EXTERNAL_RESEARCH_PROVIDER=${getExternalResearchProviderName()} (expected tavily).`);
    process.exit(2);
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    console.log("OPENAI_API_KEY is present; this script still skips Claims/Signals.");
  } else {
    console.log("OPENAI_API_KEY absent — skipping Claims/Signals as required.");
  }

  const fixture = pickFixture();
  if (!fixture) {
    console.error("No public company fixture available.");
    process.exit(1);
  }

  const officialDomain = fixture.officialDomain || null;
  const provider = new TavilyExternalResearchProvider({ officialDomain });
  const queries = generateResearchQueries({
    companyName: fixture.canonicalName,
    officialDomain,
    country: fixture.headquartersCountry,
    maxQueries: 2,
  });

  const discovered: DiscoveredSource[] = [];
  for (const item of queries) {
    const query = item.site ? `site:${item.site} ${item.query}` : item.query;
    const rows = await provider.search({ query, limit: 3 });
    discovered.push(...rows);
  }

  const assessed = dedupeSources(discovered.map((row) => assessSource(row, officialDomain)));
  const accepted = assessed.filter((row) => row.accepted);
  const httpUrls = assessed.filter((row) => /^https?:\/\//i.test(row.url));

  if (discovered.length < 1) {
    throw new Error("Tavily returned no sources for the live fixture.");
  }
  if (httpUrls.length < 1) {
    throw new Error("Mapped sources did not include http(s) URLs.");
  }
  if (assessed.some((row) => row.normalizedUrl !== normalizeUrl(row.canonicalUrl || row.url))) {
    throw new Error("Source candidate mapping missed normalized_url.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: provider.name,
        company: fixture.canonicalName,
        queryCount: queries.length,
        discoveredCount: discovered.length,
        assessedCount: assessed.length,
        acceptedCount: accepted.length,
        rejectedCount: assessed.length - accepted.length,
        sample: assessed.slice(0, 5).map((row) => ({
          url: row.url,
          publisher: row.publisher,
          sourceType: row.sourceType,
          quality: row.sourceQuality,
          accepted: row.accepted,
          publishedAt: row.publishedAt,
        })),
        openai: "skipped",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Live research test failed.";
  console.error(message);
  process.exit(1);
});
