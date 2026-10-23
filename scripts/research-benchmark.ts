/** ONE real run, explicitly scoped to an authorized non-demo identity. No seeded fallback. */
import {existsSync} from "node:fs";
import {loadEnvFile} from "node:process";
import {createClient} from "@supabase/supabase-js";
import {startExternalCompanyResearch,tickExternalCompanyResearch} from "../src/server/external-research/orchestrator";
import {listResearchEvents,listSourceCandidates,isTerminalStatus} from "../src/server/external-research/persistence";
import {loadResearchAssessment} from "../src/server/product/research-assessment";
import {checkLanguageModelProviderHealth} from "../src/server/ai/language-model-health";
for(const path of [".env.local",".env"]) if(existsSync(path)) loadEnvFile(path);
const required=["NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","TAVILY_API_KEY","OLLAMA_EXTRACTION_MODEL","SIGNAL_BENCHMARK_WORKSPACE_ID","SIGNAL_BENCHMARK_EMAIL"];
async function residentModels(){
  try {const response=await fetch(`${process.env.OLLAMA_BASE_URL??"http://127.0.0.1:11434"}/api/ps`,{signal:AbortSignal.timeout(2000)});
    if(!response.ok)return null;const body=await response.json() as {models?:Array<{name:string;size:number;size_vram:number}>};
    return (body.models??[]).map(m=>({name:m.name,bytes:m.size,vramBytes:m.size_vram}));
  } catch{return null;}
}
async function main(){
  const missing=required.filter(key=>!process.env[key]?.trim());
  if(missing.length){console.log(JSON.stringify({status:"BLOCKED_EXTERNAL_CONFIGURATION",missing,realRunsStarted:0}));process.exitCode=2;return;}
  if(process.env.EXTERNAL_RESEARCH_PROVIDER!=="tavily"||process.env.LANGUAGE_MODEL_PROVIDER!=="ollama") throw new Error("Benchmark requires the real Tavily/Ollama configuration.");
  const query=process.argv[2]?.trim();if(!query)throw new Error("Provide exactly one company query.");
  const email=process.env.SIGNAL_BENCHMARK_EMAIL!.trim().toLowerCase();if(/^demo\.|@signal\.test$/.test(email))throw new Error("Use an explicitly authorized real test identity, not a demo account.");
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const workspaceId=process.env.SIGNAL_BENCHMARK_WORKSPACE_ID!;
  const {data:authorization,error}=await db.from("workspace_authorized_emails").select("status,activated_user_id").eq("workspace_id",workspaceId).eq("email",email).single();
  if(error||authorization?.status!=="active"||!authorization.activated_user_id)throw new Error("Benchmark identity must have completed authorized first access.");
  const health=await checkLanguageModelProviderHealth({includeSmoke:false});if(!health.reachable||!health.modelInstalled)throw new Error("Ollama/model unavailable.");
  const before=await residentModels();const started=performance.now();const cpu=process.cpuUsage();
  let run=await startExternalCompanyResearch({workspaceId,userId:authorization.activated_user_id,query,selectedDomain:process.argv[3]??null,confirmUnresolved:Boolean(process.argv[3])});
  while(!isTerminalStatus(run.status)&&performance.now()-started<30*60_000){
    const next=await tickExternalCompanyResearch(workspaceId,run.id);
    if(next.updated_at===run.updated_at)await new Promise(r=>setTimeout(r,1000));
    run=next;
  }
  const sources=await listSourceCandidates(run.id);const assessment=await loadResearchAssessment(run);
  const timings=(await listResearchEvents(run.id)).filter(e=>e.event_type==="phase_timing"&&typeof e.payload.cpuUserMs==="number").map(e=>e.payload);
  const totals:Record<string,number>={};for(const phase of timings)for(const [key,value]of Object.entries(phase))if(typeof value==="number"&&!/Rss/.test(key))totals[key]=(totals[key]??0)+value;
  console.log(JSON.stringify({status:isTerminalStatus(run.status)?"EXECUTED":"INCOMPLETE",runId:run.id,execution:run.status,outcome:assessment.researchOutcome,
    wallMs:Math.round(performance.now()-started),cpu:process.cpuUsage(cpu),rssBytes:process.memoryUsage().rss,
    residentModelsBefore:before,residentModelsAfter:await residentModels(),totals,phases:timings,
    sources:sources.map(s=>({url:s.url,publisher:s.publisher,type:s.source_type,quality:s.source_quality,status:s.status,date:s.published_at})),
    claims:assessment.activeClaimCount,signals:assessment.qualifiedSignalCount,coverage:{sufficient:assessment.sufficient,gaps:assessment.gaps},realRunsStarted:1},null,2));
  if(!isTerminalStatus(run.status)||run.status==="failed"||run.status==="needs_user_resolution")process.exitCode=2;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Benchmark failed");process.exitCode=1;});
