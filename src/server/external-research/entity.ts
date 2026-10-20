import { PUBLIC_COMPANY_CATALOG } from "./catalog";
import { levenshtein, normalizeCompanyQuery } from "./normalize";
import type { CompanyIdentity, EntityCandidate, EntityResolution } from "./types";

export interface ExistingCompanyRecord {
  id: string;
  slug: string;
  displayName: string;
  domain: string | null;
  country: string | null;
  industry: string | null;
  aliases: string[];
}

export function resolveCompanyEntity(input: {
  query: string;
  country?: string | null;
  industry?: string | null;
  existing?: ExistingCompanyRecord[];
  /** Official domain confirmed by the user — must not overwrite corporate HQ with research geography. */
  selectedDomain?: string | null;
}): EntityResolution {
  const normalized = normalizeCompanyQuery(input.query);
  if (!normalized) return { kind: "unresolved", suggestions: [] };

  const selectedDomain = input.selectedDomain?.replace(/^www\./, "").toLowerCase() || null;
  if (selectedDomain) {
    const byDomain = PUBLIC_COMPANY_CATALOG.find(
      (identity) => identity.officialDomain.replace(/^www\./, "").toLowerCase() === selectedDomain,
    );
    if (byDomain) {
      return {
        kind: "resolved",
        candidate: {
          ...byDomain,
          existingCompanyId: input.existing?.find((row) => (row.domain ?? "").replace(/^www\./, "") === selectedDomain)?.id ?? null,
          existingSlug: input.existing?.find((row) => (row.domain ?? "").replace(/^www\./, "") === selectedDomain)?.slug ?? null,
          decisionBasis: [...byDomain.decisionBasis, "user-confirmed official domain"],
        },
      };
    }
  }

  const existingMatches = (input.existing ?? []).flatMap((row) => {
    const names = [row.displayName, row.slug, ...(row.aliases ?? []), row.domain ?? ""];
    const hit = names.some((name) => name && (normalizeCompanyQuery(name) === normalized || normalizeCompanyQuery(name).includes(normalized)));
    if (!hit) return [];
    return [toCandidateFromExisting(row, ["existing workspace record"])];
  });

  const catalogMatches = PUBLIC_COMPANY_CATALOG.filter((identity) => identityMatches(identity, normalized, input.country, input.industry));

  const unique = dedupeCandidates([
    ...existingMatches,
    ...catalogMatches.map((identity) => toCandidate(identity, existingMatches)),
  ]);

  if (unique.length === 1) {
    const candidate = unique[0];
    if (candidate && isExactOrAlias(candidate, normalized)) {
      return { kind: "resolved", candidate };
    }
  }

  if (unique.length > 1) {
    const exact = unique.filter((candidate) => isExactOrAlias(candidate, normalized) && !isPartialOnly(candidate));
    if (exact.length === 1 && exact[0]) return { kind: "resolved", candidate: exact[0] };
    // Research geography may filter local subsidiaries (e.g. Toyota BR) but must not invent HQ.
    const countryFiltered = input.country
      ? unique.filter((candidate) => candidate.headquartersCountry.toUpperCase() === input.country?.trim().toUpperCase())
      : unique;
    if (countryFiltered.length === 1 && countryFiltered[0] && isExactOrAlias(countryFiltered[0], normalized)) {
      return { kind: "resolved", candidate: countryFiltered[0] };
    }
    return { kind: "ambiguous", candidates: unique };
  }

  const suggestions = PUBLIC_COMPANY_CATALOG.filter((identity) => {
    const distance = Math.min(...[identity.canonicalName, ...identity.aliases].map((name) => levenshtein(normalized, normalizeCompanyQuery(name))));
    return distance > 0 && distance <= 2;
  }).map((identity) => toCandidate(identity, existingMatches));

  if (suggestions.length === 1 && suggestions[0] && levenshtein(normalized, normalizeCompanyQuery(suggestions[0].canonicalName)) === 0) {
    return { kind: "resolved", candidate: suggestions[0] };
  }

  return { kind: "unresolved", suggestions };
}

function identityMatches(identity: CompanyIdentity, normalized: string, country?: string | null, industry?: string | null): boolean {
  const names = [identity.canonicalName, ...identity.aliases].map(normalizeCompanyQuery);
  const nameHit = names.some(
    (name) =>
      name === normalized ||
      name.startsWith(`${normalized} `) ||
      normalized.startsWith(name) ||
      name.includes(normalized),
  );
  if (!nameHit) return false;
  if (country && identity.headquartersCountry.toUpperCase() !== country.trim().toUpperCase() && normalized === "vale") {
    return identity.headquartersCountry === "BR";
  }
  if (industry && identity.industry && !identity.industry.toLowerCase().includes(industry.toLowerCase()) && names.every((name) => name !== normalized)) {
    return false;
  }
  return true;
}

/** Infer a coarse corporate domicile hint from the registrable domain — never from research scope. */
export function inferHeadquartersFromDomain(domain: string | null | undefined): string {
  if (!domain) return "";
  const host = domain.replace(/^www\./, "").toLowerCase();
  if (host.endsWith(".br")) return "BR";
  if (host.endsWith(".fr")) return "FR";
  if (host.endsWith(".it")) return "IT";
  if (host.endsWith(".de")) return "DE";
  if (host.endsWith(".uk") || host.endsWith(".co.uk")) return "GB";
  if (host.endsWith(".jp")) return "JP";
  if (host.endsWith(".se")) return "SE";
  if (host.endsWith(".be")) return "BE";
  return "";
}

function isExactOrAlias(candidate: EntityCandidate, normalized: string): boolean {
  return [candidate.canonicalName, ...candidate.aliases].map(normalizeCompanyQuery).some((name) => name === normalized || name.startsWith(normalized));
}

function isPartialOnly(candidate: EntityCandidate): boolean {
  return candidate.decisionBasis.some((basis) => basis.startsWith("partial name"));
}

function toCandidate(identity: CompanyIdentity, existing: EntityCandidate[]): EntityCandidate {
  const match = existing.find((row) => row.officialDomain === identity.officialDomain);
  return {
    ...identity,
    existingCompanyId: match?.existingCompanyId ?? null,
    existingSlug: match?.existingSlug ?? null,
  };
}

function toCandidateFromExisting(row: ExistingCompanyRecord, basis: string[]): EntityCandidate {
  return {
    canonicalName: row.displayName,
    officialDomain: (row.domain ?? "").replace(/^www\./, ""),
    headquartersCountry: row.country ?? "",
    industry: row.industry ?? "",
    aliases: row.aliases,
    decisionBasis: basis,
    existingCompanyId: row.id,
    existingSlug: row.slug,
  };
}

function dedupeCandidates(items: EntityCandidate[]): EntityCandidate[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.officialDomain || `${item.canonicalName}|${item.headquartersCountry}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
