/** Production HTTP contract smoke; real authenticated browser acceptance is separate. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
const port=3101;
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{stdio:["ignore","pipe","pipe"],env:{...process.env,DEMO_MODE:"false",DEMO_AUTH_MODE:"false",SIGNAL_LOCAL_PREVIEW:"1"}});
let output="";child.stdout.on("data",d=>output+=d);child.stderr.on("data",d=>output+=d);
try {
  const deadline=Date.now()+20000;
  while(!output.includes("Ready")) {
    if(child.exitCode!==null || Date.now()>deadline) throw new Error(`Next HTTP smoke startup failed: ${output.slice(0,300)}`);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  for(const path of ["/","/companies"]) {
    const response=await fetch(`http://127.0.0.1:${port}${path}`,{redirect:"manual",signal:AbortSignal.timeout(10000)});
    assert.equal(response.status,307);
    assert.match(response.headers.get("location")??"",/\/login/);
  }
  const login=await fetch(`http://127.0.0.1:${port}/login`,{signal:AbortSignal.timeout(10000)});
  assert.equal(login.status,200);const loginHtml=await login.text();assert.match(loginHtml,/<html/);
  assert.ok(loginHtml.includes("Entre no SIGNAL"));
  assert.ok(!loginHtml.includes("Entrar como membro de demonstração"));
  assert.ok(!loginHtml.includes("Horizonte Industrial"));
  assert.ok(!loginHtml.includes("PREVIEW LOCAL"));
  const callback=await fetch(`http://127.0.0.1:${port}/auth/callback?next=https://evil.example`,{redirect:"manual",signal:AbortSignal.timeout(10000)});
  assert.equal(callback.status,307);assert.equal(new URL(callback.headers.get("location")).pathname,"/companies");
  assert.notEqual(new URL(callback.headers.get("location")).hostname,"evil.example");
  for(const path of ["/preview", "/preview/companies/horizonte-industrial", "/preview/research/new", "/preview/admin"]) {
    const response=await fetch(`http://127.0.0.1:${port}${path}`,{signal:AbortSignal.timeout(10000)});
    const body=await response.text();
    assert.equal(response.status,404,`production must deny ${path} even with preview flag`);
    assert.equal(body.includes("Pessoa de revisão"),false);
  }
  console.log("PASS production HTTP: login, protected home/companies and callback redirect containment");
  console.log("PASS production HTTP: local preview is unavailable even when its flag is enabled");
} finally {child.kill("SIGTERM");}
