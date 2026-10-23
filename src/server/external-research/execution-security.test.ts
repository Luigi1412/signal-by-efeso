import assert from "node:assert/strict";
import test from "node:test";
import { safeFetch } from "./fetch-safe";
import { assertSafeHttpUrl, isPrivateOrMetadataAddress } from "./ssrf";
import { registrableDomain } from "./normalize";
import { abortable, mapBounded } from "./runtime";
const lookup = async () => ["1.1.1.1"];

test("private IPv4, IPv6 and mapped ranges fail closed", () => {
  for (const ip of ["10.1.2.3","127.0.0.1","169.254.169.254","::1","fc00::1","fe80::1","::ffff:127.0.0.1","::ffff:a00:1","ff02::1","2001:db8::1"]) {
    assert.equal(isPrivateOrMetadataAddress(ip), true, ip);
  }
  assert.equal(isPrivateOrMetadataAddress("2606:4700:4700::1111"), false);
  assert.throws(() => assertSafeHttpUrl("https://user:secret@example.com"));
});
test("PSL handles Brazilian, UK and private hosted domains", () => {
  assert.equal(registrableDomain("ri.company.com.br"),"company.com.br");
  assert.equal(registrableDomain("investors.company.co.uk"),"company.co.uk");
  assert.equal(registrableDomain("one.github.io"),"one.github.io");
});
test("unknown Content-Length is bounded while streaming and cancels upstream", async () => {
  let pulls=0; let cancelled=false;
  await assert.rejects(safeFetch({url:"https://example.com/report",lookup,maxBytes:10,
    fetchImpl:async()=>new Response(new ReadableStream({pull(c){pulls++;c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}}),{headers:{"content-type":"text/plain"}})}), /byte budget/);
  assert.ok(pulls<=4); assert.equal(cancelled,true);
});
test("deadline covers body after headers", async () => {
  await assert.rejects(safeFetch({url:"https://example.com/stall",lookup,timeoutMs:20,
    fetchImpl:async()=>new Response(new ReadableStream({start(){}}),{headers:{"content-type":"text/plain"}})}), /deadline/);
});
test("DNS private answer blocks normal connection before fetch", async () => {
  let called=false;
  await assert.rejects(safeFetch({url:"https://example.com/private",lookup:async()=>["10.0.0.5"],fetchImpl:async()=>{called=true;return new Response();}}), /DNS/);
  assert.equal(called,false);
});
test("abort and bounded network concurrency",async()=>{
  let active=0,peak=0;
  await mapBounded([1,2,3,4],2,async()=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,3));active--;});
  assert.equal(peak,2);
  const c=new AbortController();const pending=abortable(new Promise(()=>{}),c.signal);c.abort(new Error("cancelled"));
  await assert.rejects(pending,/cancelled/);
});
