import { normalizeCompanyQuery, hostnameOf, registrableDomain, isSubdomainOrEqual } from "./normalize";
import { assertSafeHttpUrl } from "./ssrf";
import { isAggregatorHost, publisherAuthorityClass } from "./aggregators";
import { mapBounded, researchSignal } from "./runtime";
import type { EntityCandidate, EntityResolution, ExternalResearchProvider } from "./types";

const ORGANIZATION_TYPES = /^(?:Organization|Corporation|LocalBusiness|Brand|Airline|FinancialService|AutomotiveBusiness|Manufacturer)$/i;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function normalizeIdentityDomain(value: string): string {
  const url = assertSafeHttpUrl(value.includes("://") ? value : `https://${value}`);
  return hostnameOf(url.toString()) ?? "";
}
function countryCode(value: unknown): string {
  const raw = text(value) || text(object(value).name);
  if (/^[A-Z]{2}$/i.test(raw)) return raw.toUpperCase();
  return ({brazil:"BR",brasil:"BR",france:"FR",italy:"IT",italia:"IT",japan:"JP",germany:"DE","united states":"US","united kingdom":"GB"} as Record<string,string>)[raw.toLowerCase()] ?? "";
}
function nameMatches(query: string, values: string[]): boolean {
  const normalized = normalizeCompanyQuery(query);
  if (!normalized) return false;
  return values.some(value => {
    const name = normalizeCompanyQuery(value);
    return name === normalized || name.startsWith(`${normalized} `) || normalized.startsWith(`${name} `);
  });
}

/** Identity is taken from the publisher's own structured organization record, never search snippets. */
export function identityFromHtml(query: string, url: string, html: string): EntityCandidate[] {
  const host = hostnameOf(url);
  if (!host) return [];
  const nodes: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const row = object(value);
    if (Object.keys(row).length === 0) return;
    nodes.push(row);
    if (row["@graph"]) visit(row["@graph"]);
    if (row.mainEntity) visit(row.mainEntity);
    if (row.publisher) visit(row.publisher);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1]!)); } catch { /* Unparseable data is not evidence. */ }
  }
  const out: EntityCandidate[] = [];
  for (const row of nodes) {
    const types = Array.isArray(row["@type"]) ? row["@type"] : [row["@type"]];
    if (!types.some(type => ORGANIZATION_TYPES.test(text(type)))) continue;
    const canonicalName = text(row.legalName) || text(row.name);
    const aliases = [text(row.name), ...(Array.isArray(row.alternateName) ? row.alternateName.map(text) : [text(row.alternateName)])].filter(Boolean);
    const brands = (Array.isArray(row.brand) ? row.brand : row.brand ? [row.brand] : []).map(value=>text(object(value).name)||text(value)).filter(Boolean);
    const parentName = text(object(row.parentOrganization).name);
    if (!nameMatches(query, [canonicalName,...aliases,...brands])) continue;
    let domain=host;
    try { if (text(row.url)) domain=normalizeIdentityDomain(text(row.url)); } catch { continue; }
    if (registrableDomain(domain)!==registrableDomain(host)) continue;
    const address=object(row.address);
    out.push({canonicalName, officialDomain:domain, headquartersCountry:countryCode(address.addressCountry), industry:"", aliases,
      entityKind: parentName ? "subsidiary" : types.includes("Brand") ? "brand" : brands.length ? "parent" : "company",
      relationshipToQuery: nameMatches(query,[canonicalName,...aliases]) ? "exact" : "brand_of",
      parent: parentName ? {name:parentName,domain:text(object(row.parentOrganization).url)||null} : null,
      brands, subsidiaries:[], publicIdentityEvidence:[url],
      decisionBasis:["public organization structured data", "name and official hostname corroborated"], existingCompanyId:null, existingSlug:null});
  }
  return out;
}

export async function discoverPublicIdentity(input:{query:string;provider:ExternalResearchProvider;selectedDomain?:string|null}):Promise<EntityResolution> {
  const hits = input.selectedDomain ? [{url:`https://${normalizeIdentityDomain(input.selectedDomain)}/`,title:input.query,publisher:input.query,sourceType:"official_page" as const,sourceTier:1 as const,publishedAt:null}] :
    await input.provider.search({query:`"${input.query.replace(/["\\]/g, "")}" official company corporate website about`,limit:6});
  const seen=new Set<string>();
  const candidates=hits.filter(hit=>{
    const host=hostnameOf(hit.url);
    if(!host||seen.has(registrableDomain(host))||isAggregatorHost(host)||publisherAuthorityClass(host)==="reputable_news"||/wikipedia|linkedin|facebook|instagram|youtube/.test(host)) return false;
    seen.add(registrableDomain(host)); return true;
  }).slice(0,3);
  const found=(await mapBounded(candidates,2,async hit=>{
    try {
      const doc=await input.provider.fetchDocument(hit.url);
      if(!/html/.test(doc.mimeType)) return [];
      const finalHost=hostnameOf(doc.finalUrl)??"";
      if(input.selectedDomain&&!isSubdomainOrEqual(finalHost,normalizeIdentityDomain(input.selectedDomain))) return [];
      return identityFromHtml(input.query,doc.finalUrl,new TextDecoder().decode(doc.bytes));
    } catch { researchSignal()?.throwIfAborted(); return []; }
  })).flat();
  const unique=[...new Map(found.map(row=>[`${row.officialDomain}|${row.canonicalName}`,row])).values()];
  if(unique.length===1) return {kind:"resolved",candidate:unique[0]!};
  if(unique.length>1) return {kind:"ambiguous",candidates:unique};
  return {kind:"unresolved",suggestions:[]};
}
