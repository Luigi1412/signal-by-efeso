import type { DiscoveredSource, ExternalResearchProvider, FetchedDocument } from "./types";

export interface FakeResearchFixtures {
  search: Record<string, DiscoveredSource[]>;
  pages: Record<string, { title: string; body: string; mimeType?: string; unavailable?: boolean }>;
}

const DEFAULT_FIXTURES: FakeResearchFixtures = {
  search: {
    suzano: [
      {
        url: "https://www.suzano.com.br/investors",
        title: "Investor Relations",
        publisher: "Suzano S.A.",
        sourceType: "official_page",
        sourceTier: 1,
        publishedAt: "2026-03-01",
      },
      {
        url: "https://www.suzano.com.br/press-releases/expansion",
        title: "Suzano announces capacity expansion",
        publisher: "Suzano S.A.",
        sourceType: "press_release",
        sourceTier: 1,
        publishedAt: "2026-04-12",
      },
      {
        url: "https://www.suzano.com.br/press-releases/expansion?utm_source=mirror",
        title: "Suzano announces capacity expansion",
        publisher: "Mirror Wire",
        sourceType: "press_release",
        sourceTier: 3,
        publishedAt: "2026-04-12",
        canonicalUrl: "https://www.suzano.com.br/press-releases/expansion",
      },
      {
        url: "https://company-investor-relations.fake.com/suzano",
        title: "Suzano IR impostor",
        publisher: "Fake IR",
        sourceType: "official_page",
        sourceTier: 1,
        publishedAt: "2026-04-12",
      },
      {
        url: "https://random-blog.example/suzano-is-failing",
        title: "Blog contradicts official release",
        publisher: "Random Blog",
        sourceType: "other",
        sourceTier: 4,
        publishedAt: "2026-04-13",
      },
    ],
  },
  pages: {
    "https://www.suzano.com.br/investors": {
      title: "Investor Relations",
      body: "Suzano S.A. reports pulp production and capital investment plans in Brazil.",
    },
    "https://www.suzano.com.br/press-releases/expansion": {
      title: "Suzano announces capacity expansion",
      body: "Suzano announced a capacity increase and capex investment in Brazil operations.",
    },
    "https://random-blog.example/suzano-is-failing": {
      title: "Blog",
      body: "Anonymous post claiming Suzano is shutting plants without evidence.",
    },
  },
};

export class FakeExternalResearchProvider implements ExternalResearchProvider {
  readonly name = "fake";

  constructor(private readonly fixtures: FakeResearchFixtures = DEFAULT_FIXTURES) {}

  async search(input: { query: string; limit: number }): Promise<DiscoveredSource[]> {
    const key = Object.keys(this.fixtures.search).find((item) => input.query.toLowerCase().includes(item));
    const rows = key ? this.fixtures.search[key] ?? [] : [];
    return rows.slice(0, input.limit);
  }

  async fetchPage(url: string): Promise<FetchedDocument> {
    return this.fetchDocument(url);
  }

  async fetchDocument(url: string): Promise<FetchedDocument> {
    if (url.startsWith("http://localhost") || url.includes("127.0.0.1")) {
      throw new Error("BLOCKED_HOST");
    }
    const page = this.fixtures.pages[url];
    if (!page || page.unavailable) {
      throw new Error("UNAVAILABLE");
    }
    const html = `<html><head><title>${page.title}</title></head><body><main>${page.body}</main></body></html>`;
    return {
      url,
      finalUrl: url,
      bytes: new TextEncoder().encode(html),
      mimeType: page.mimeType ?? "text/html",
      title: page.title,
    };
  }
}

export function createDefaultFakeResearchProvider(): FakeExternalResearchProvider {
  return new FakeExternalResearchProvider();
}
