/** Read-only preflight for the REAL app. Values and upstream response bodies are never printed. */
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
for (const path of ['.env.local', '.env']) if (existsSync(path)) loadEnvFile(path);

export function configurationRows(env = process.env) {
  const present = key => Boolean(env[key]?.trim()) && !/your[-_ ]|placeholder|changeme|<[^>]+>/i.test(env[key]);
  const model = env.LANGUAGE_MODEL_PROVIDER?.trim();
  return [
    { name:'Supabase project', ready:present('NEXT_PUBLIC_SUPABASE_URL'), setting:'NEXT_PUBLIC_SUPABASE_URL', action:'Supabase > Project Settings > Data API: URL do projeto.' },
    { name:'Supabase anon key', ready:present('NEXT_PUBLIC_SUPABASE_ANON_KEY'), setting:'NEXT_PUBLIC_SUPABASE_ANON_KEY', action:'Supabase > Project Settings > API Keys: chave anon/legacy ou publishable.' },
    { name:'Supabase server key', ready:present('SUPABASE_SERVICE_ROLE_KEY'), setting:'SUPABASE_SERVICE_ROLE_KEY', action:'Supabase > Project Settings > API Keys: service_role/secret, somente no servidor.' },
    { name:'Tavily', ready:present('TAVILY_API_KEY'), setting:'TAVILY_API_KEY', action:'Tavily > API Keys: configurar a chave no .env.local.' },
    { name:'External research', ready:env.EXTERNAL_RESEARCH_PROVIDER==='tavily' && env.EXTERNAL_RESEARCH_ENABLED==='true', setting:'EXTERNAL_RESEARCH_PROVIDER=tavily / EXTERNAL_RESEARCH_ENABLED=true', action:'Ativar o provedor real Tavily no .env.local.' },
    { name:'Model', ready:model==='ollama' ? present('OLLAMA_EXTRACTION_MODEL') && present('OLLAMA_BASE_URL') : model==='openai' && present('OPENAI_API_KEY') && present('OPENAI_EXTRACTION_MODEL'), setting:model==='openai'?'LANGUAGE_MODEL_PROVIDER / OPENAI_API_KEY / OPENAI_EXTRACTION_MODEL':'LANGUAGE_MODEL_PROVIDER=ollama / OLLAMA_BASE_URL / OLLAMA_EXTRACTION_MODEL', action:'Escolher o provedor e configurar um modelo disponível; nenhuma saída sintética é aceita.' },
    { name:'Worker', ready:env.RESEARCH_WORKER_ENABLED==='true', setting:'RESEARCH_WORKER_ENABLED=true', action:'O app:local inicia o worker separado; check de heartbeat disponível após iniciar.' },
    { name:'Authorization boundary', ready:env.ALLOWED_EMAIL_DOMAINS?.trim()==='efeso.com', setting:'ALLOWED_EMAIL_DOMAINS=efeso.com', action:'Não adicionar gmail.com. Exceções são aprovadas por endereço na allowlist.' },
    { name:'Callbacks', ready:/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(env.NEXT_PUBLIC_APP_URL??''), setting:'NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000', action:'Supabase > Authentication > URL Configuration: Site URL e Redirect URL http://127.0.0.1:3000/auth/callback.' },
    { name:'Real mode', ready:['DEMO_MODE','DEMO_AUTH_MODE','SIGNAL_ALLOW_MOCK_FALLBACK'].every(k=>env[k]==='false') && env.SIGNAL_LOCAL_PREVIEW!=='1', setting:'DEMO_MODE=false / DEMO_AUTH_MODE=false / SIGNAL_ALLOW_MOCK_FALLBACK=false / SIGNAL_LOCAL_PREVIEW=0', action:'Usar o produto real. QA permanece separado e opt-in.' },
  ].map(row=>({...row,status:row.ready?'CONFIGURED_UNVERIFIED':'MISSING'}));
}
export async function checkRealConfiguration({ network=true }={}) {
  const rows=configurationRows();
  const env=process.env;
  let workspaceId;
  async function check(name,action,operation) {
    try { const ok=await operation();rows.push({name,ready:ok,status:ok?'READY':'BLOCKED',action,setting:'Remote health'}); }
    catch {rows.push({name,ready:false,status:'UNREACHABLE',action,setting:'Remote health'});}
  }
  const configured=name=>rows.find(r=>r.name===name)?.ready;
  if(network && configured('Supabase project') && configured('Supabase anon key') && configured('Supabase server key')) {
    const base=env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/,'');
    const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,...(env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`})};
    const get=path=>fetch(base+path,{headers,signal:AbortSignal.timeout(6000)});
    await check('Supabase Auth', 'Verificar URL/chave, disponibilidade do projeto e serviço Auth.',async()=> (await fetch(base+'/auth/v1/health',{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(6000)})).ok);
    await check('Workspace real','npm run workspace:init (não cria empresas, pesquisa nem usuários).',async()=>{const r=await get('/rest/v1/workspaces?select=id&slug=eq.efeso-brazil&status=eq.active');if(!r.ok)return false;const entries=await r.json();workspaceId=entries[0]?.id;return entries.length===1;});
    await check('Migration 052', 'Executar npm run db:plan e npm run db:apply no projeto vinculado; nunca reset.',async()=>(await get('/rest/v1/workspace_authorized_emails?select=external_access_approved&limit=1')).ok);
    await check('Release integrity','Verificar migrations, RLS e ownership antes da pesquisa.',async()=>{const r=await fetch(base+'/rest/v1/rpc/signal_release_integrity',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(6000)});if(!r.ok)return false;const b=await r.json();return b?.rls===true&&b?.allowlist_enforced===true&&b?.ownership===true&&b?.fencing===true;});
    await check('EFESO Knowledge 195','npm run import:efeso-knowledge -- --dry-run; depois npm run import:efeso-knowledge.',async()=>{if(!workspaceId)return false;const r=await get('/rest/v1/efeso_knowledge_objects?select=id&status=eq.active&workspace_id=eq.'+workspaceId+'&limit=1000');if(!r.ok)return false;return (await r.json()).length===195;});
  }
  if(network && configured('Tavily')) {
    await check('Tavily authentication','Verificar a chave e os limites no painel Tavily.',async()=> (await fetch('https://api.tavily.com/usage',{headers:{Authorization:`Bearer ${env.TAVILY_API_KEY}`},redirect:'error',signal:AbortSignal.timeout(6000)})).ok);
  }
  if(network && configured('Model') && env.LANGUAGE_MODEL_PROVIDER==='openai') {
    await check('OpenAI model availability','Verificar a chave e o nome do modelo disponível na conta.',async()=> (await fetch('https://api.openai.com/v1/models/'+encodeURIComponent(env.OPENAI_EXTRACTION_MODEL),{headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`},redirect:'error',signal:AbortSignal.timeout(6000)})).ok);
  }
  if(network && configured('Model') && env.LANGUAGE_MODEL_PROVIDER==='ollama') {
    await check('Ollama model health','Iniciar Ollama e instalar exatamente o OLLAMA_EXTRACTION_MODEL configurado.',async()=>{const r=await fetch(env.OLLAMA_BASE_URL.replace(/\/$/,'')+'/api/tags',{signal:AbortSignal.timeout(4000)});if(!r.ok)return false;const body=await r.json();const selected=env.OLLAMA_EXTRACTION_MODEL;return (body.models??[]).some(m=>m.name===selected||m.name===`${selected}:latest`);});
  }
  return {ready:rows.every(r=>r.ready),rows,realRunsStarted:0};
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const result=await checkRealConfiguration();
  console.table(result.rows.map(({name,status,setting})=>({configuration:name,status,setting})));
  for(const row of result.rows.filter(r=>!r.ready))console.log(`${row.name}: ${row.action}`);
  console.log('Chave presente não significa integração validada. Auth, pesquisa e QA reais exigem execução end-to-end. Nenhuma pesquisa foi iniciada por este comando.');
  process.exitCode=result.ready?0:2;
}
