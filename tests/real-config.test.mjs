import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {configurationRows} from '../scripts/real-config.mjs';
const valid={NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-only-value',SUPABASE_SERVICE_ROLE_KEY:'test-only-value',TAVILY_API_KEY:'test-only-value',EXTERNAL_RESEARCH_PROVIDER:'tavily',EXTERNAL_RESEARCH_ENABLED:'true',LANGUAGE_MODEL_PROVIDER:'ollama',OLLAMA_BASE_URL:'http://127.0.0.1:11434',OLLAMA_EXTRACTION_MODEL:'test-model',RESEARCH_WORKER_ENABLED:'true',ALLOWED_EMAIL_DOMAINS:'efeso.com',NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3000',DEMO_MODE:'false',DEMO_AUTH_MODE:'false',SIGNAL_ALLOW_MOCK_FALLBACK:'false',SIGNAL_LOCAL_PREVIEW:'0'};
const row=(env,name)=>configurationRows(env).find(r=>r.name===name);
test('credential presence is never described as a successful live integration',()=>{
 assert.ok(configurationRows({}).every(r=>r.status==='MISSING'));
 assert.ok(configurationRows(valid).every(r=>r.status==='CONFIGURED_UNVERIFIED'));
});
test('fake providers, broad external domains and demo switches fail real startup configuration',()=>{
 assert.equal(row({...valid,EXTERNAL_RESEARCH_PROVIDER:'fake'},'External research').ready,false);
 assert.equal(row({...valid,LANGUAGE_MODEL_PROVIDER:'fake'},'Model').ready,false);
 assert.equal(row({...valid,ALLOWED_EMAIL_DOMAINS:'efeso.com,gmail.com'},'Authorization boundary').ready,false);
 assert.equal(row({...valid,DEMO_MODE:'true'},'Real mode').ready,false);
 assert.equal(row({...valid,SIGNAL_LOCAL_PREVIEW:'1'},'Real mode').ready,false);
});
test('real callback configuration accepts only a local HTTP origin',()=>{
 for(const url of ['https://evil.example','http://localhost.evil:3000','http://127.0.0.1:3000@evil.example','http://localhost:3000/path'])assert.equal(row({...valid,NEXT_PUBLIC_APP_URL:url},'Callbacks').ready,false);
});
test('the optional OpenAI provider requires its own credentials, not Ollama configuration',()=>{
 const env={...valid,LANGUAGE_MODEL_PROVIDER:'openai',OPENAI_API_KEY:'test-only-value',OPENAI_EXTRACTION_MODEL:'test-model',OLLAMA_EXTRACTION_MODEL:''};
 assert.equal(row(env,'Model').ready,true);
 assert.equal(row({...env,OPENAI_API_KEY:''},'Model').ready,false);
});
test('missing credentials stop app and worker before launch without printing a configured key',()=>{
 const env={...process.env};for(const key of Object.keys(valid))env[key]='';
 env.TAVILY_API_KEY='DO-NOT-PRINT-THIS-TEST-VALUE';
 const result=spawnSync(process.execPath,['scripts/real-local.mjs'],{env,encoding:'utf8'});
 assert.equal(result.status,2);
 assert.match(result.stderr,/PRODUCT READY: BLOCKED/);
 assert.ok(!(result.stdout+result.stderr).includes(env.TAVILY_API_KEY));
 assert.ok(!(result.stdout+result.stderr).includes('Next.js'));
});
