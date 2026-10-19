import {
  allowFakeExternalResearch,
  getExternalResearchProviderName,
  getTavilyApiKey,
  isExternalResearchEnabled,
} from "./config";
import { FakeExternalResearchProvider } from "./fake-provider";
import { HttpExternalResearchProvider } from "./http-provider";
import { TavilyExternalResearchProvider } from "./tavily-provider";
import type { ExternalResearchProvider } from "./types";

export function createMemberExternalResearchProvider(officialDomain?: string | null): ExternalResearchProvider | null {
  if (!isExternalResearchEnabled()) return null;
  const name = getExternalResearchProviderName();
  if (name === "tavily") return new TavilyExternalResearchProvider({ officialDomain });
  if (name === "http") return new HttpExternalResearchProvider(officialDomain);
  return null;
}

export function createAdminExternalResearchProvider(officialDomain?: string | null): ExternalResearchProvider | null {
  const name = getExternalResearchProviderName();
  if (name === "fake" && allowFakeExternalResearch()) return new FakeExternalResearchProvider();
  if (!isExternalResearchEnabled()) return null;
  if (name === "tavily") return new TavilyExternalResearchProvider({ officialDomain });
  if (name === "http") return new HttpExternalResearchProvider(officialDomain);
  return null;
}

export function createExternalResearchProvider(input?: {
  officialDomain?: string | null;
  allowFake?: boolean;
}): ExternalResearchProvider | null {
  if (input?.allowFake) return createAdminExternalResearchProvider(input.officialDomain);
  return createMemberExternalResearchProvider(input?.officialDomain);
}

export function realExternalResearchConfigured(): boolean {
  const name = getExternalResearchProviderName();
  if (name === "tavily") return Boolean(getTavilyApiKey());
  return name === "http";
}
