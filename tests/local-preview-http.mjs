/** Real Next development HTTP checks with an explicit network tripwire. No research. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import { once } from "node:events";

const port = 3102;
let externalRequests = 0;
const tripwire = createServer((_request, response) => { externalRequests++; response.writeHead(500); response.end("No real service in preview tests"); });
tripwire.listen(0, "127.0.0.1");
await once(tripwire, "listening");
const address = tripwire.address();
const fakeEndpoint = `http://127.0.0.1:${address.port}`;
const child = spawn(process.execPath, ["scripts/local-preview.mjs"], { stdio: ["ignore", "pipe", "pipe"], env: {
  ...process.env, NODE_ENV: "development", SIGNAL_PREVIEW_PORT: String(port),
  NEXT_PUBLIC_SUPABASE_URL: fakeEndpoint, NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-only-not-a-real-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-not-a-real-key", OLLAMA_BASE_URL: fakeEndpoint,
} });
let output = "";
child.stdout.on("data", chunk => { output += chunk; });
child.stderr.on("data", chunk => { output += chunk; });
const read = (path, headers) => new Promise((resolve, reject) => {
  const req = request(`http://127.0.0.1:${port}${path}`, { headers }, response => {
    const chunks = [];
    response.on("data", chunk => chunks.push(chunk));
    response.on("end", () => resolve({ response: { status: response.statusCode, headers: new Headers(response.headers) }, html: Buffer.concat(chunks).toString("utf8") }));
    response.on("error", reject);
  });
  req.setTimeout(60000, () => req.destroy(new Error("Preview HTTP deadline exceeded")));
  req.on("error", reject);
  req.end();
});
try {
  const deadline = Date.now() + 30000;
  while (!output.includes("Ready")) {
    if (child.exitCode !== null || Date.now() > deadline) throw new Error(`Preview startup failed: ${output.slice(-800)}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  for (const path of ["/preview", "/preview/companies", "/preview/research/new", "/preview/research/preview-local-horizonte-industrial?phase=needs_user_resolution", "/preview/research/preview-local-horizonte-industrial?phase=generating_intelligence", "/preview/account", "/preview/admin", "/preview/admin/release-health", "/preview/sources/expansao"]) {
    const { response, html } = await read(path);
    assert.equal(response.status, 200, path);
    assert.ok(html.includes("PREVIEW LOCAL"), path);
    if (path === "/preview/research/new") {
      assert.ok(html.includes("Qual empresa você quer entender?"));
      assert.ok(html.includes("Mais opções"));
      assert.ok(html.includes("Pesquisar empresa"));
      assert.ok(html.includes("Cenários de identificação"));
      assert.ok(!html.includes('id="instructions"'), "member search must not require a research brief");
    }
    if (path.includes("phase=generating_intelligence")) {
      assert.ok(html.includes('role="status"'));
      assert.ok(html.includes('aria-label="Etapas da pesquisa"'));
      assert.ok(html.includes("Preparando resultado"));
      assert.ok(!html.includes('aria-valuenow'), "phase progress is not a measured percentage");
    }
  }
  const home = await read("/preview/companies");
  assert.ok(home.html.includes('aria-label="Empresas analisadas"'));
  assert.ok(!home.html.includes("<table"), "the company list must adapt without a wide administrative table");
  assert.ok(home.html.includes("1 oportunidade a validar"));
  assert.ok(!home.html.includes("0 oportunidades"));
  const account = await read("/preview/account");
  assert.ok(account.html.includes("Sem usuário autenticado"));
  assert.ok(!account.html.includes("pessoa@preview.invalid"), "preview must not impersonate a signed-in person");
  assert.ok(!account.html.includes(">Sair</button>"));
  for (const [slug, material] of [["horizonte-industrial", true], ["verde-papel", false], ["oficina-delta", false]]) {
    const { response, html } = await read(`/preview/companies/${slug}`);
    assert.equal(response.status, 200);
    assert.equal(html.includes('id="report-efeso"'), material);
    assert.equal(html.includes('id="report-movimentos"'), slug !== "oficina-delta");
    assert.ok(html.includes('href="/preview/companies"'));
    assert.ok(html.includes("fictícios"));
    if (slug === "horizonte-industrial") {
      assert.ok(html.includes("Por que isso importa"));
      assert.ok(html.includes("R$ 180 milhões"));
      assert.ok(html.includes("250 mil unidades"));
      assert.ok(html.includes("2027"));
      assert.ok(html.includes("Implicação operacional"));
      assert.ok(html.includes("Possível necessidade"));
      assert.ok(html.includes("Hipótese comercial"));
      assert.ok(html.includes("Oportunidade a validar"));
      assert.ok(html.includes('id="report-evidencias"'));
      assert.ok(html.includes("Ver evidência original"));
      assert.ok(html.includes("evidências deste movimento"));
    } else if (slug === "verde-papel") {
      assert.ok(html.includes("Por que não há sinal"));
      assert.ok(!html.includes("Oportunidade a validar"));
    } else {
      assert.ok(html.includes("O que faltou"));
      assert.ok(!html.includes("O que conseguimos confirmar"), "an empty confirmation section must be omitted");
      assert.ok(html.includes("Atualizar pesquisa"));
      assert.ok(!html.includes("Por que não há sinal"));
      assert.ok(!html.includes("fatos validados</span>"), "insufficient report must not show a zero KPI strip");
    }
  }
  for (const headers of [{ host: "public.example" }, { "x-forwarded-host": "public.example" }, { "x-forwarded-for": "203.0.113.8" }]) {
    const { response } = await read("/preview", headers);
    assert.equal(response.status, 404, `non-local preview request: ${JSON.stringify(headers)}`);
  }
  const protectedPage = await read("/companies");
  assert.equal(protectedPage.response.status, 307);
  assert.match(protectedPage.response.headers.get("location"), /\/login/);
  assert.equal(externalRequests, 0, "preview must not connect to configured external services");
  console.log("PASS development HTTP: companies, form, resolution, phases, three report states, account, admin, source excerpts");
  console.log("PASS isolation: normal routes remain protected, non-local requests denied, zero requests to configured Supabase/Ollama");
} catch (error) {
  console.error(output.slice(-4000));
  throw error;
} finally {
  child.kill("SIGTERM");
  tripwire.close();
}
