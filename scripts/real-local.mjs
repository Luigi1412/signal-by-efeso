/** Start the existing real app and worker together, without demo switches or credential logging. */
import {spawn} from 'node:child_process';
import {checkRealConfiguration} from './real-config.mjs';
const configured=await checkRealConfiguration({network:false});
const result=configured.ready ? await checkRealConfiguration() : configured;
if(!result.ready){
 console.error('PRODUCT READY: BLOCKED — configuração real incompleta. Execute npm run check:real.');
 for(const row of result.rows.filter(r=>!r.ready))console.error(`${row.name}: ${row.setting}`);
 process.exit(2);
}
const port=new URL(process.env.NEXT_PUBLIC_APP_URL).port;
if(!port || !Number.isInteger(Number(port)) || Number(port)<1024 || Number(port)>65535)throw Error('Porta local inválida.');
const env={...process.env,DEMO_MODE:'false',DEMO_AUTH_MODE:'false',SIGNAL_ALLOW_MOCK_FALLBACK:'false',SIGNAL_LOCAL_PREVIEW:'0',NEXT_TELEMETRY_DISABLED:'1'};
const children=[spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',port],{env,stdio:'inherit'}),spawn(process.execPath,['--import','./scripts/stub-server-only.mjs','--import','tsx','scripts/research-worker.ts'],{env,stdio:'inherit'})];
let stopping=false;
function stop(code){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
for(const child of children){child.on('error',()=>stop(1));child.on('exit',code=>stop(code??1));}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));
console.log(`App real + worker. Abra ${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/,'')}/companies após Ready. Nenhuma pesquisa é iniciada automaticamente.`);
