import { isSubdomainOrEqual, normalizeUrl, registrableDomain } from "./normalize";
import { isEcommercePath, isSocialHost } from "./source-noise";
import type { AssessedSource, DiscoveredSource, SourceQuality } from "./types";

const AUTHORITATIVE_NEWS = new Set([
  "reuters.com",
  "ft.com",
  "bloomberg.com",
  "wsj.com",
  "valor.globo.com",
  "folha.uol.com.br",
  "estadao.com.br",
  "exame.com",
  "bnamericas.com",
  "infomoney.com.br",
  "pipelinevalor.globo.com",
  "braziljournal.com",
  "neofeed.com.br",
  "cnnbrasil.com.br",
  "g1.globo.com",
  "finance.yahoo.com",
  "yahoo.com",
  "cnbc.com",
  "marketwatch.com",
  "seekingalpha.com",
]);

const WEAK_HINTS = [
  /blog/,
  /wordpress/,
  /medium\.com/,
  /substack/,
  /seo/,
  /prnewswire-clone/,
  /scribd\.com/,
  /slideshare/,
  /issuu\.com/,
  /pinterest/,
];

const FILING_HOST = /(?:^|\.)(?:sec\.gov|cvm\.gov\.br|b3\.com\.br)$/i;

const GENERIC_COMPANY_TOKENS = new Set([
  "ltda",
  "limitada",
  "company",
  "companies",
  "group",
  "grupo",
  "holding",
  "sa",
  "inc",
  "corp",
  "corporation",
  "plc",
  "llc",
]);

export function assessSource(
  source: DiscoveredSource,
  officialDomain: string | null,
  asOf = new Date(),
  companyName?: string | null,
): AssessedSource {
  const host = safeHost(source.url);
  const path = safePath(source.url);
  const official = officialDomain ? isSubdomainOrEqual(host, officialDomain) : false;
  const impersonator = officialDomain ? host.includes(officialDomain.replace(/\./g, "-")) && !official : false;
  const named = mentionsCompany(`${source.title ?? ""} ${source.url} ${source.publisher}`, companyName);
  const quality = deriveQuality(source, host, official, impersonator);
  const stale = isOutsideHorizon(source.publishedAt, asOf, 24) && !isInstitutionalKeep(source.sourceType);

  let accepted = quality !== "weak" && !impersonator;
  let rejectionReason: string | null = null;

  if (impersonator) {
    accepted = false;
    rejectionReason = "impostor_domain";
  } else if (isSocialHost(host)) {
    accepted = false;
    rejectionReason = "social_media";
  } else if (isEcommercePath(path) || isEcommercePath(source.url)) {
    accepted = false;
    rejectionReason = "ecommerce_noise";
  } else if (isBareHomepageShell(host, path, source, official)) {
    accepted = false;
    rejectionReason = "homepage_shell";
  } else if (quality === "weak") {
    accepted = false;
    rejectionReason = "weak_source";
  } else if (!official && !named) {
    // Filings/news without the company name in title/URL drift to unrelated issuers (e.g. Azul CVM for Suvinil).
    accepted = false;
    rejectionReason = "off_topic_company";
  } else if (stale && source.sourceTier >= 3) {
    accepted = false;
    rejectionReason = "outside_horizon";
  }

  return {
    ...source,
    normalizedUrl: normalizeUrl(source.canonicalUrl || source.url),
    sourceQuality: quality,
    accepted,
    rejectionReason,
  };
}

function deriveQuality(
  source: DiscoveredSource,
  host: string,
  official: boolean,
  impersonator: boolean,
): SourceQuality {
  if (impersonator) return "weak";
  if (isSocialHost(host)) return "weak";
  if (!official && (source.sourceType === "official_page" || source.sourceType === "press_release") && source.sourceTier <= 1) {
    return "weak";
  }
  if (official && source.sourceTier <= 2) return "primary";
  if (source.sourceType === "filing" || source.sourceType === "regulator" || FILING_HOST.test(host)) {
    return "authoritative_secondary";
  }
  if (AUTHORITATIVE_NEWS.has(registrableDomain(host))) return "secondary";
  if (WEAK_HINTS.some((pattern) => pattern.test(host) || pattern.test(source.publisher.toLowerCase()))) return "weak";
  if (source.sourceTier >= 4) return "weak";
  return "secondary";
}

export function isOutsideHorizon(publishedAt: string | null, asOf: Date, months: number): boolean {
  if (!publishedAt) return false;
  const stamp = new Date(`${publishedAt.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(stamp.getTime())) return false;
  const horizon = new Date(asOf);
  horizon.setUTCMonth(horizon.getUTCMonth() - months);
  return stamp < horizon;
}

function isInstitutionalKeep(type: DiscoveredSource["sourceType"]): boolean {
  return type === "annual_report" || type === "sustainability_report" || type === "official_page";
}

function isBareHomepageShell(
  host: string,
  path: string,
  source: DiscoveredSource,
  official: boolean,
): boolean {
  const bare = path === "/" || path === "";
  if (!bare) return false;
  // IR/RI hosts are intentional discovery seeds even at /.
  if (/^(?:ir|ri)\./i.test(host)) return false;
  // Corporate marketing homepage is usually thin — prefer /investors, /newsroom, PDFs.
  if (official) return true;
  if (AUTHORITATIVE_NEWS.has(registrableDomain(host))) return true;
  if (source.sourceType === "news") return true;
  return false;
}

function companyTokens(companyName?: string | null): string[] {
  if (!companyName) return [];
  return companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !GENERIC_COMPANY_TOKENS.has(token));
}

function mentionsCompany(hay: string, companyName?: string | null): boolean {
  const tokens = companyTokens(companyName);
  if (tokens.length === 0) return true; // no name → cannot enforce relevance
  const normalizedHay = hay
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return tokens.some((token) => normalizedHay.includes(token));
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
}

export function mapQualityToSourceTier(quality: SourceQuality): "A" | "B" | "C" | "D" | "E" {
  if (quality === "primary") return "A";
  if (quality === "authoritative_secondary") return "B";
  if (quality === "secondary") return "C";
  return "E";
}

export function mapExternalTypeToSourceType(type: DiscoveredSource["sourceType"]): string {
  switch (type) {
    case "official_page":
      return "corporate_page";
    case "press_release":
      return "corporate_press_release";
    case "annual_report":
      return "annual_report";
    case "earnings_release":
      return "earnings_release";
    case "filing":
      return "regulatory_filing";
    case "regulator":
      return "government";
    case "news":
      return "news";
    default:
      return "other";
  }
}
