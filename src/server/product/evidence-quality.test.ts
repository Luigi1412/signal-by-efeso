import assert from "node:assert/strict";
import test from "node:test";
import { assessEvidence, ambiguousMetric, type AssessableClaim } from "./evidence-quality";
import { evaluateResearchQualityGate } from "./research-quality-gate";
const asOf=new Date('2026-10-21');
function fact(id:string,statement:string,source=id):AssessableClaim{return {id,statement,category:'capacity',metric:null,numericValue:null,unit:null,currency:null,date:'2026-09-01',precise:true,excerpts:[statement],sources:[{id:source,url:`https://company.example/release/${source}`,primary:true,authoritative:true,publishedAt:'2026-09-01'}]};}
test('coverage requires material cited evidence, never the first fact or weak page volume',()=>{
 const one=assessEvidence({claims:[fact('a','Capacity increased after a new plant investment')],signals:[],horizonMonths:24,asOf});assert.equal(one.sufficient,false);
 const claims=[fact('a','Capacity increased with a new plant investment'),fact('b','Production ramp-up will reduce supply chain constraints'),fact('c','Capex expands factory throughput')];
 const good=assessEvidence({claims,signals:[{id:'s',type:'production_ramp_up',claimIds:['a','b']}],horizonMonths:24,asOf});assert.equal(good.sufficient,true);assert.equal(good.qualifiedSignalCount,1);
 const weak=claims.flatMap((c,i)=>Array.from({length:10},(_,n)=>({...c,id:`${i}-${n}`,sources:c.sources.map(s=>({...s,primary:false,authoritative:false,url:'https://companiesmarketcap.com/company/earnings'}))})));
 assert.equal(assessEvidence({claims:weak,signals:[],horizonMonths:24,asOf}).sufficient,false);
});
test('financial metrics alone, unknown citations and stale facts cannot qualify signals',()=>{
 const financial=[fact('a','Revenue reached USD 2bn'),fact('b','Net income reached USD 1bn')].map(c=>({...c,category:'financial'}));
 assert.equal(assessEvidence({claims:financial,signals:[{id:'s',type:'performance_improvement',claimIds:['a','b']}],horizonMonths:24,asOf}).qualifiedSignalCount,0);
 const claims=[fact('a','Production capacity increased'),fact('b','New plant expansion')];
 assert.equal(assessEvidence({claims,signals:[{id:'s',type:'expansion',claimIds:['a','b','unknown']}],horizonMonths:24,asOf}).qualifiedSignalCount,0);
 const stale=claims.map(c=>({...c,date:'2020-01-01',sources:c.sources.map(s=>({...s,publishedAt:'2020-01-01'}))}));
 assert.equal(assessEvidence({claims:stale,signals:[{id:'s',type:'expansion',claimIds:['a','b']}],horizonMonths:24,asOf}).qualifiedSignalCount,0);
});
test('ambiguous earnings are reviewed; EPS/net income explicitly defined are retained',()=>{
 assert.equal(ambiguousMetric('earnings','Earnings in 2024 were $3.42bn','earnings 2024 $3.42bn'),true);
 assert.equal(ambiguousMetric('net earnings','Net earnings were $3.42bn','Net income is reported'),false);
 assert.equal(ambiguousMetric('earnings per share','Earnings per share $2','EPS $2'),false);
});
test('quality publication fails closed for unknown identity or provenance even if a signal row exists',()=>{
 const base={signalCount:1,qualifiedSignalCount:1,activeClaimCount:3,preciseClaimCount:3,provenanceClaimCount:3,primarySourceCount:2,secondaryOnlyClaimCount:0,recentMaterialClaimCount:3,entityConfirmed:true};
 assert.equal(evaluateResearchQualityGate(base).researchOutcome,'signal_found');
 assert.equal(evaluateResearchQualityGate({...base,entityConfirmed:false}).researchOutcome,'insufficient_evidence');
 assert.notEqual(evaluateResearchQualityGate({...base,provenanceClaimCount:0}).researchOutcome,'signal_found');
 assert.notEqual(evaluateResearchQualityGate({...base,recentMaterialClaimCount:0}).researchOutcome,'signal_found');
});
