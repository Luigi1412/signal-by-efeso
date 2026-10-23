import { hostnameOf, isSubdomainOrEqual, normalizeUrl } from "./normalize";
import { assertSafeHttpUrl } from "./ssrf";
import { classifySource } from "./tavily-map";
import { mapBounded, researchSignal } from "./runtime";
import type { DiscoveredSource, ExternalResearchProvider } from "./types";

/** Only first-party links may establish an additional official IR hostname. */
export function officialLinksFromHtml(html:string,baseUrl:string,domain:string,company:string) {
  const sources:DiscoveredSource[]=[];const domains=new Set<string>([domain]);
  for(const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label=match[2]!.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    let url:URL;try {url=assertSafeHttpUrl(new URL(match[1]!.replace(/&amp;/g,'&'),baseUrl).href);} catch {continue;}
    const host=hostnameOf(url.href)??'';
    const investor=/investor|rela[cç][oõ]es com investidores|\binvestidores\b|\bIR\b|\bRI\b/i.test(label);
    const same=isSubdomainOrEqual(host,domain);
    if(!same&&!investor) continue;
    if(!same&&investor) domains.add(host);
    if(!investor&&!/annual.?report|resultados|financial.?results|press.?release|earnings|relat[oó]rio anual|production|capacidade|release/i.test(`${label} ${url.pathname}`)) continue;
    const classified=classifySource(url.href,label,same?domain:host);
    sources.push({url:normalizeUrl(url.href),title:`${company} — ${label || url.pathname}`,publisher:company,sourceType:classified.sourceType,sourceTier:1,publishedAt:null});
    if(sources.length>=16) break;
  }
  return {sources,domains:[...domains]};
}
export async function discoverOfficialLinks(provider:ExternalResearchProvider,domain:string,company:string) {
  const root=await provider.fetchDocument(`https://${domain}/`);
  if(!root.mimeType.includes('html')||!isSubdomainOrEqual(hostnameOf(root.finalUrl)??'',domain)) return {sources:[],domains:[domain]};
  const first=officialLinksFromHtml(new TextDecoder().decode(root.bytes),root.finalUrl,domain,company);
  // A single bounded navigation hop finds reports behind IR landing pages.
  const landingPages=first.sources.filter(source=>source.sourceType==="official_page").slice(0,2);
  const documents=await mapBounded(landingPages,2,async source=>{
    try {
      const document=await provider.fetchDocument(source.url);
      const trusted=first.domains.find(known=>isSubdomainOrEqual(hostnameOf(document.finalUrl)??"",known));
      if(!trusted||!document.mimeType.includes("html")) return [];
      return officialLinksFromHtml(new TextDecoder().decode(document.bytes),document.finalUrl,trusted,company).sources.filter(source=>first.domains.some(known=>isSubdomainOrEqual(hostnameOf(source.url)??"",known)));
    } catch { researchSignal()?.throwIfAborted();return []; }
  });
  const sources=[...first.sources,...documents.flat()];
  return {sources:[...new Map(sources.map(source=>[source.url,source])).values()].slice(0,40),domains:first.domains};
}
