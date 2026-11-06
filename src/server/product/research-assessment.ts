import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { assessEvidence, type AssessableClaim, type AssessableSignal, type CitedSource } from "./evidence-quality";
import { isNumericClaimPrecise } from "./claim-precision";
import { evaluateResearchQualityGate } from "./research-quality-gate";
import { listSourceCandidates } from "@/server/external-research/persistence";
import { publisherAuthorityClass } from "@/server/external-research/aggregators";
import type { ExternalResearchRunRow } from "@/server/external-research/types";

/** Batch reads of current-analysis citations; source counts alone never establish support. */
export async function loadResearchAssessment(run: ExternalResearchRunRow, proposedSignal?: AssessableSignal) {
  const db=createPipelineAdminClient();
  const read=async <T>(request:PromiseLike<{data:unknown;error:unknown}>):Promise<T[]>=>{const r=await request;if(r.error) throw r.error;return (r.data??[]) as T[];};
  type Claim={id:string;statement:string;claim_category:string;metric_name:string|null;numeric_value:number|null;unit:string|null;currency_code:string|null;period_end:string|null;as_of_date:string|null;verification_status:string;entity_relationship?:string};
  const retained = (await listSourceCandidates(run.id)).filter(source=>source.snapshot_id && source.status === "fetched");
  const retainedSnapshots = new Set(retained.map(source=>source.snapshot_id!));
  const claims=run.analysis_id?await read<Claim>(db.from("claims").select("id,statement,claim_category,metric_name,numeric_value,unit,currency_code,period_end,as_of_date,verification_status,entity_relationship").eq("workspace_id",run.workspace_id).eq("company_id",run.resolved_company_id).eq("claim_status","active").order("created_at",{ascending:false}).limit(300)):[];
  const ids=claims.map(c=>c.id);
  const links=ids.length?await read<{claim_id:string;evidence_fragment_id:string}>(db.from("claim_evidence").select("claim_id,evidence_fragment_id").eq("workspace_id",run.workspace_id).in("claim_id",ids).eq("relationship","supports")):[];
  const fragments=links.length?await read<{id:string;source_snapshot_id:string;excerpt:string}>(db.from("evidence_fragments").select("id,source_snapshot_id,excerpt").eq("workspace_id",run.workspace_id).in("id",[...new Set(links.map(l=>l.evidence_fragment_id))])):[];
  const snapshots=fragments.length?await read<{id:string;source_id:string;publication_date:string|null}>(db.from("source_snapshots").select("id,source_id,publication_date").eq("workspace_id",run.workspace_id).in("id",[...new Set(fragments.map(f=>f.source_snapshot_id))])):[];
  const sources=snapshots.length?await read<{id:string;canonical_url:string;is_primary_source:boolean;source_type:string}>(db.from("sources").select("id,canonical_url,is_primary_source,source_type").eq("workspace_id",run.workspace_id).in("id",[...new Set(snapshots.map(s=>s.source_id))])):[];
  const bySource=new Map(sources.map(s=>[s.id,s]));const bySnapshot=new Map(snapshots.map(s=>[s.id,s]));const byFragment=new Map(fragments.map(f=>[f.id,f]));
  const assessed:AssessableClaim[]=claims.map(c=>{
    const cited=links.filter(l=>l.claim_id===c.id).map(l=>byFragment.get(l.evidence_fragment_id)).filter(f=>Boolean(f && retainedSnapshots.has(f.source_snapshot_id)));
    const citedSources:CitedSource[]=cited.flatMap(f=>{
      const snapshot=bySnapshot.get(f!.source_snapshot_id);const source=snapshot?bySource.get(snapshot.source_id):null;
      return source?[{id:source.id,url:source.canonical_url,primary:source.is_primary_source,
        authoritative:["regulatory","reputable_news"].includes(publisherAuthorityClass(source.canonical_url))||["regulatory_filing","government"].includes(source.source_type),publishedAt:snapshot!.publication_date}]:[];
    });
    const numericPrecise = isNumericClaimPrecise({
      numericValue: c.numeric_value,
      metricName: c.metric_name,
      unit: c.unit,
      currencyCode: c.currency_code,
    });
    return {id:c.id,statement:c.statement,category:c.claim_category,metric:c.metric_name,numericValue:c.numeric_value,unit:c.unit,currency:c.currency_code,date:c.as_of_date??c.period_end,
      precise:["supported","corroborated"].includes(c.verification_status)&&numericPrecise, sources:citedSources,excerpts:cited.map(f=>f!.excerpt)};
  });
  const signalLinks=ids.length?await read<{signal_id:string;claim_id:string;relationship_type:string}>(db.from("signal_claims").select("signal_id,claim_id,relationship_type").eq("workspace_id",run.workspace_id).in("claim_id",ids)):[];
  const allSignalLinks = signalLinks.length ? await read<{signal_id:string;claim_id:string;relationship_type:string}>(db.from("signal_claims").select("signal_id,claim_id,relationship_type").eq("workspace_id",run.workspace_id).in("signal_id",[...new Set(signalLinks.map(l=>l.signal_id))])) : [];
  const signals=signalLinks.length?await read<{id:string;signal_type:string}>(db.from("signals").select("id,signal_type").eq("workspace_id",run.workspace_id).eq("company_id",run.resolved_company_id).eq("status","active").in("id",[...new Set(signalLinks.map(l=>l.signal_id))])):[];
  const evidence=assessEvidence({claims:assessed,signals:[...signals.map(s=>({id:s.id,type:s.signal_type,claimIds:allSignalLinks.filter(l=>l.signal_id===s.id&&l.relationship_type!=="contextual_evidence").map(l=>l.claim_id)})),...(proposedSignal?[proposedSignal]:[])],horizonMonths:run.time_horizon_months});
  const coverageVerdict =
    run.resolution_payload.coverage_assessment &&
    typeof run.resolution_payload.coverage_assessment === "object" &&
    "verdict" in (run.resolution_payload.coverage_assessment as object)
      ? ((run.resolution_payload.coverage_assessment as { verdict?: string }).verdict as
          | "adequate"
          | "research_coverage_insufficient"
          | "public_evidence_insufficient"
          | undefined)
      : undefined;
  const extractionCoverage =
    run.resolution_payload.extraction_coverage &&
    typeof run.resolution_payload.extraction_coverage === "object"
      ? (run.resolution_payload.extraction_coverage as {
          documentsAttempted?: number;
          documentsExtracted?: number;
          documentsTimedOut?: number;
          documentsFailed?: number;
          claimsExtracted?: number;
          circuitOpened?: boolean;
        })
      : null;
  const gate=evaluateResearchQualityGate({...evidence,signalCount:signals.length,entityConfirmed:run.resolution_payload.entityConfirmed===true,
    runStatus:run.status,failureCode:run.failure_code,unavailableSourceCount:run.unavailable_source_count,
    insufficientEvidenceForSignal:evidence.qualifiedSignalCount===0,
    coverageVerdict: coverageVerdict ?? null,
    extractionCoverage});
  return {version:"evidence-v2" as const,...evidence,...gate,coverageVerdict:coverageVerdict??null,extractionCoverage};
}
