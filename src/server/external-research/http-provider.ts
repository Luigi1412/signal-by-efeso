import { officialSeedUrls } from "./queries";
import { safeFetch } from "./fetch-safe";
import { extractHtmlText } from "./html";
import type { DiscoveredSource, ExternalResearchProvider, FetchedDocument } from "./types";

export class HttpExternalResearchProvider implements ExternalResearchProvider {
  readonly name = "http";

  constructor(private readonly officialDomain?: string | null) {}

  async search(input: { query: string; limit: number }): Promise<DiscoveredSource[]> {
    if (!this.officialDomain) return [];
    return officialSeedUrls(this.officialDomain)
      .slice(0, input.limit)
      .map((url) => ({
        url,
        title: input.query,
        publisher: this.officialDomain ?? "unknown",
        sourceType: url.includes("press") ? "press_release" : "official_page",
        sourceTier: 1 as const,
        publishedAt: null,
      }));
  }

  async fetchPage(url: string): Promise<FetchedDocument> {
    return this.fetchDocument(url);
  }

  async fetchDocument(url: string): Promise<FetchedDocument> {
    const result = await safeFetch({ url });
    const title = result.mimeType.includes("html")
      ? extractHtmlText(new TextDecoder().decode(result.bytes)).title
      : null;
    return {
      url,
      finalUrl: result.url,
      bytes: result.bytes,
      mimeType: result.mimeType,
      title,
    };
  }
}
