import { isOutsideHorizon } from "@/server/external-research/quality";
import { hostnameOf, registrableDomain } from "@/server/external-research/normalize";
import { isAggregatorHost } from "@/server/external-research/aggregators";
export interface CitedSource {
  id: string; url: string; primary: boolean; authoritative: boolean; publishedAt: string | null;
}
export interface AssessableClaim {
  id: string; statement: string; category: string; metric: string | null;
  numericValue: number | null; unit: string | null; currency: string | null;
  date: string | null; precise: boolean; sources: CitedSource[]; excerpts: string[];
}
export interface AssessableSignal { id: string; type: string; claimIds: string[]; }
export function ambiguousMetric(metric: string | null, statement: string, evidence: string): boolean {
  const label=(metric??"").trim();
  if(!/\bearnings\b/i.test(`${label} ${statement}`)) return false;
  // EPS and explicitly named net/operating/pre-tax income are distinct, defined metrics.
  return !/earnings per share|\bEPS\b|net (?:income|profit|earnings)|operating (?:income|profit|earnings)|before (?:interest|tax)|\bEBITDA?\b|lucro (?:líquido|operacional)/i.test(`${label} ${evidence}`);
}
export function operationalThemes(statement: string, category=""): string[] {
  const patterns: Record<string,RegExp>={
    capacity:/capacity|capacida|ramp.?up|throughput|production|produ[cç][aã]o|deliveries|entregas|backlog/i,
    footprint:/factory|facilit|plant|f[aá]brica|closure|fechamento|expan[sd]/i,
    integration:/acquisit|aquisi|merger|fus[aã]o|integration|integra[cç]/i,
    performance:/cost reduction|redu[cç][aã]o de custo|productiv|produtiv|working capital|capital de giro|restructur|reestrutur/i,
    supply_chain:/supply.?chain|cadeia|supplier|fornecedor|inventory|estoque|log[ií]stic/i,
    reliability:/maintenance|manuten[cç]|reliab|confiabil|quality|qualidade|shutdown|parada/i,
    investment:/capex|investimento|investment|automation|automa[cç]|digital transforma/i,
  };
  return Object.entries(patterns).filter(([,pattern])=>pattern.test(statement)).map(([theme])=>theme)
    .concat(["manufacturing","capacity","supply_chain","operations"].includes(category)?[category]:[]);
}
export function assessEvidence(input:{claims:AssessableClaim[];signals:AssessableSignal[];horizonMonths:number;asOf?:Date}) {
  const asOf=input.asOf??new Date();
  const qualified=input.claims.filter(c=>c.precise&&!ambiguousMetric(c.metric,c.statement,c.excerpts.join(" "))&&c.sources.length>0&&c.excerpts.some(x=>x.trim().length>0));
  const recent=qualified.filter(c=>{
    const dates=c.sources.map(s=>s.publishedAt).filter((v):v is string=>Boolean(v));
    if(c.date && Date.parse(c.date) <= asOf.getTime()) {dates.length=0;dates.push(c.date);}
    return dates.some(date=>Date.parse(date)<=asOf.getTime()+86400_000&&!isOutsideHorizon(date,asOf,input.horizonMonths));
  });
  const material=recent.filter(c=>operationalThemes(c.statement,c.category).length>0);
  const sources=[...new Map(qualified.flatMap(c=>c.sources).map(s=>[s.id,s])).values()];
  const primary=sources.filter(s=>s.primary&&!isAggregatorHost(s.url));
  const supporting=new Map(qualified.map(c=>[c.id,c]));
  const materialIds=new Set(material.map(c=>c.id));
  const qualifiedSignals=input.signals.filter(signal=>{
    if(signal.type==="other") return false;
    const claims=[...new Set(signal.claimIds)].map(id=>supporting.get(id)).filter((v):v is AssessableClaim=>Boolean(v));
    if(claims.length<2||claims.length!==new Set(signal.claimIds).size||!claims.some(c=>materialIds.has(c.id))) return false;
    const cited=[...new Map(claims.flatMap(c=>c.sources).map(s=>[s.id,s])).values()];
    const authoritative=cited.filter(s=>!isAggregatorHost(s.url)&&(s.primary||s.authoritative));
    const publishers=new Set(authoritative.map(s=>registrableDomain(hostnameOf(s.url)??s.url)));
    return authoritative.some(s=>s.primary)||publishers.size>=2;
  });
  const themes=[...new Set(material.flatMap(c=>operationalThemes(c.statement,c.category)))];
  const publisherCount=new Set(primary.map(s=>registrableDomain(hostnameOf(s.url)??s.url))).size;
  // Two complementary official documents can suffice; extra weak pages never do.
  const sufficient=primary.length>=2&&material.length>=3&&themes.length>=2&&recent.length>=3&&
    (publisherCount>=2||primary.length>=3);
  return { qualifiedClaimIds:qualified.map(c=>c.id), qualifiedSignalIds:qualifiedSignals.map(s=>s.id),
    activeClaimCount:qualified.length, preciseClaimCount:qualified.length, provenanceClaimCount:qualified.length,
    primarySourceCount:primary.length, secondaryOnlyClaimCount:qualified.filter(c=>!c.sources.some(s=>s.primary)).length,
    recentMaterialClaimCount:material.length, qualifiedSignalCount:qualifiedSignals.length,
    themes, sufficient, gaps:[...(primary.length===0?["no_cited_primary_source"]:[]),...(material.length===0?["no_recent_material_movement"]:[]),...(!sufficient?["coverage_not_demonstrated"]:[])] };
}
