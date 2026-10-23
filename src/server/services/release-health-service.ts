import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { getAllowedEmailDomains } from "@/server/access/email-domains";
import { SOURCE_FILES_BUCKET } from "@/server/storage/source-file-storage";
import { SIGNAL_PRODUCT_VERSION } from "@/lib/product-version";
import { getLanguageModelProviderName, getOpenAiApiKey } from "@/server/ai/config";
import { checkLanguageModelProviderHealth } from "@/server/ai/language-model-health";
import { getExternalResearchProviderName, getTavilyApiKey } from "@/server/external-research/config";
import { listProductionEnvStatus } from "@/server/config/production-env";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type HealthStatus = "ok" | "missing" | "pending" | "failed";

export interface ReleaseHealthCheck {
  id: string;
  labelKey:
    | "application"
    | "db"
    | "auth"
    | "domain"
    | "demoSeed"
    | "demoMode"
    | "openai"
    | "liveTest"
    | "languageProvider"
    | "ollama"
    | "ollamaModel"
    | "localAiSmoke"
    | "tavily"
    | "externalResearch"
    | "researchWorker"
    | "knowledgePack"
    | "realKnowledge"
    | "rls"
    | "storage"
    | "migrations"
    | "latestResearch"
    | "buildVersion";
  status: HealthStatus;
  detail: string;
}

export interface ReleaseHealthSnapshot {
  version: string;
  openaiConfigured: boolean;
  checks: ReleaseHealthCheck[];
}

export async function getReleaseHealth(): Promise<ReleaseHealthSnapshot> {
  const version = SIGNAL_PRODUCT_VERSION;
  const openaiConfigured = Boolean(getOpenAiApiKey());
  const authConfigured = isSupabaseConfigured();
  const domains = getAllowedEmailDomains();
  const providerName = getLanguageModelProviderName();
  const lm = await checkLanguageModelProviderHealth({ includeSmoke: false });
  const tavilyReady = getExternalResearchProviderName() === "tavily" && Boolean(getTavilyApiKey());
  const demoMode = isDemoMode();
  const workerEnabled = (process.env.RESEARCH_WORKER_ENABLED ?? "true").trim().toLowerCase() !== "false";

  const packPath = resolve(process.cwd(), "data/efeso-knowledge/efeso-knowledge-pack.v1.json");
  const packPresent = existsSync(packPath);
  let packObjectCount = 0;
  if (packPresent) {
    try {
      const pack = JSON.parse(readFileSync(packPath, "utf8")) as { objects?: unknown[] };
      packObjectCount = Array.isArray(pack.objects) ? pack.objects.length : 0;
    } catch {
      packObjectCount = 0;
    }
  }

  const checks: ReleaseHealthCheck[] = [
    {
      id: "application",
      labelKey: "application",
      status: "ok",
      detail: `Signal v${version}`,
    },
    {
      id: "auth",
      labelKey: "auth",
      status: authConfigured ? "pending" : "missing",
      detail: authConfigured ? "Configurado; login real precisa ser validado" : "Variáveis públicas do Supabase ausentes",
    },
    {
      id: "domain",
      labelKey: "domain",
      status: domains.length > 0 ? "ok" : "missing",
      detail: domains.length > 0 ? `${domains.join(", ")}` : "ALLOWED_EMAIL_DOMAINS vazio",
    },
    {
      id: "demoMode",
      labelKey: "demoMode",
      status: process.env.NODE_ENV === "production" && demoMode ? "failed" : "ok",
      detail: demoMode ? "DEMO_MODE=true (somente development/test)" : "DEMO_MODE=false",
    },
    {
      id: "languageProvider",
      labelKey: "languageProvider",
      status: providerName === "fake" ? "failed" : "ok",
      detail: providerName === "ollama" ? "Ollama" : providerName === "openai" ? "OpenAI" : "fake",
    },
    {
      id: "ollama",
      labelKey: "ollama",
      status: providerName !== "ollama" ? "pending" : lm.reachable ? "ok" : "failed",
      detail: providerName !== "ollama" ? "Provedor atual não é Ollama" : lm.reachable ? "healthy" : lm.detail,
    },
    {
      id: "ollamaModel",
      labelKey: "ollamaModel",
      status: providerName !== "ollama" ? "pending" : lm.modelInstalled ? "ok" : "missing",
      detail: lm.model ? `${lm.model}${lm.modelInstalled ? "" : " ausente"}` : "Nenhum modelo Ollama configurado",
    },
    {
      id: "localAiSmoke",
      labelKey: "localAiSmoke",
      status: providerName === "ollama" && lm.reachable && lm.modelInstalled ? "ok" : providerName === "ollama" ? "missing" : "pending",
      detail:
        providerName === "ollama" && lm.reachable && lm.modelInstalled
          ? "healthy — npm run test:ai-local"
          : "Execute npm run test:ai-local",
    },
    {
      id: "externalResearch",
      labelKey: "externalResearch",
      status: tavilyReady ? "pending" : "missing",
      detail: tavilyReady ? "Configurado; validação de pesquisa real pendente" : "Provedor de pesquisa externa não configurado",
    },
    {
      id: "tavily",
      labelKey: "tavily",
      status: tavilyReady ? "pending" : "missing",
      detail: tavilyReady ? "Configurado; validação de pesquisa real pendente" : "Tavily não configurado",
    },
    {
      id: "researchWorker",
      labelKey: "researchWorker",
      status: "pending",
      detail: workerEnabled ? "Worker configurado; aguardando heartbeat real" : "RESEARCH_WORKER_ENABLED=false",
    },
    {
      id: "knowledgePack",
      labelKey: "knowledgePack",
      status: packPresent && packObjectCount > 0 ? "ok" : "missing",
      detail: packPresent ? `pack presente (${packObjectCount} objetos)` : "efeso-knowledge-pack.v1.json ausente",
    },
    {
      id: "openai",
      labelKey: "openai",
      status: "pending",
      detail: openaiConfigured ? "optional / not funded" : "optional / not funded",
    },
    {
      id: "liveTest",
      labelKey: "liveTest",
      status: "pending",
      detail: "OPTIONAL / NOT FUNDED",
    },
    {
      id: "buildVersion",
      labelKey: "buildVersion",
      status: version === "1.0.0" ? "ok" : "failed",
      detail: version,
    },
  ];

  if (process.env.NODE_ENV === "production") {
    const envStatus = listProductionEnvStatus();
    const missing = envStatus.filter((row) => !row.present);
    if (missing.length > 0) {
      checks.push({
        id: "application-env",
        labelKey: "application",
        status: "failed",
        detail: `produção incompleta: ${missing.map((row) => row.key).join(", ")}`,
      });
    }
  }

  if (!authConfigured) {
    checks.unshift({ id: "db", labelKey: "db", status: "missing", detail: "Supabase não configurado" });
    checks.push({ id: "rls", labelKey: "rls", status: "missing", detail: "Não verificado" });
    checks.push({ id: "demoSeed", labelKey: "demoSeed", status: "pending", detail: "N/A fora do banco" });
    checks.push({ id: "storage", labelKey: "storage", status: "missing", detail: "Não verificado" });
    checks.push({ id: "migrations", labelKey: "migrations", status: "missing", detail: "Não verificado" });
    checks.push({ id: "realKnowledge", labelKey: "realKnowledge", status: "missing", detail: "Não verificado" });
    checks.push({ id: "latestResearch", labelKey: "latestResearch", status: "missing", detail: "Não verificado" });
    return { version, openaiConfigured, checks };
  }

  try {
    const supabase = await createServerSupabaseClient();
    checks.splice(2, 0, { id: "db", labelKey: "db", status: "ok", detail: "healthy" });
    const rpc = createPipelineAdminClient() as unknown as {rpc:(name:string)=>Promise<{data:{rls:boolean;allowlist_enforced:boolean;ownership:boolean;fencing:boolean;worker_alive:boolean;real_knowledge:number}|null;error:unknown}>};
    const integrity=await rpc.rpc("signal_release_integrity");
    const proof=integrity.error?null:integrity.data;
    checks.push({id:"rls",labelKey:"rls",status:proof?.rls&&proof.allowlist_enforced?"ok":"failed",detail:proof?.rls&&proof.allowlist_enforced?"RLS e revogação por allowlist presentes; aceitação pgTAP/browser separada":"Integridade de autorização não comprovada"});
    const worker=checks.find(check=>check.id==="researchWorker");
    if(worker){worker.status=proof?.worker_alive?"ok":"pending";worker.detail=proof?.worker_alive?"Heartbeat recente do processo worker":"Nenhum heartbeat recente do worker";}


    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("slug")
      .in("slug", ["natura", "vale", "raizen"]);
    if (companyError) throw companyError;
    const slugs = new Set((companies ?? []).map((row) => row.slug));
    const demoOk = slugs.has("natura") && slugs.has("vale") && slugs.has("raizen");
    checks.push({
      id: "demoSeed",
      labelKey: "demoSeed",
      status: demoMode ? (demoOk ? "ok" : "missing") : "pending",
      detail: demoMode
        ? demoOk
          ? "Natura, Vale e Raízen (somente demo)"
          : "Contas demo incompletas"
        : "ignorado em DEMO_MODE=false",
    });

    const { error: schemaError } = await supabase.from("efeso_fits").select("id").limit(1);
    checks.push({
      id: "migrations",
      labelKey: "migrations",
      status: schemaError || !proof?.ownership || !proof?.fencing ? "failed" : "ok",
      detail: schemaError || !proof?.ownership || !proof?.fencing ? "Migrations de execução/proteção incompletas" : "Esquema, ownership e fencing presentes",
    });

    const { count: knowledgeCount } = await supabase
      .from("efeso_knowledge_objects")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    checks.push({
      id: "realKnowledge",
      labelKey: "realKnowledge",
      status: (proof?.real_knowledge ?? 0) > 0 ? "ok" : "missing",
      detail: `${proof?.real_knowledge ?? 0} objetos reais ativos (${knowledgeCount ?? 0} acessíveis na sessão)`,
    });

    let latestResearchDetail = "Nenhuma pesquisa concluída neste ambiente";
    let latestResearchStatus: HealthStatus = "pending";
    try {
      const { createPipelineAdminClient } = await import("@/lib/supabase/pipeline-admin");
      const admin = createPipelineAdminClient();
      const { data: latestRun } = await admin
        .from("external_research_runs")
        .select("id, status, completed_at, updated_at")
        .in("status", ["completed", "partial"])
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestRun) {
        latestResearchStatus = "ok";
        latestResearchDetail = `${latestRun.status} · ${latestRun.completed_at ?? latestRun.updated_at}`;
      }
    } catch {
      latestResearchDetail = "Não verificado";
    }
    checks.push({
      id: "latestResearch",
      labelKey: "latestResearch",
      status: latestResearchStatus,
      detail: latestResearchDetail,
    });

    const { error: snapshotError } = await supabase.from("source_snapshots").select("id").limit(1);
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasLabBucket = (buckets ?? []).some((bucket) => bucket.name === SOURCE_FILES_BUCKET);
    checks.push({
      id: "storage",
      labelKey: "storage",
      status: snapshotError ? "failed" : "ok",
      detail: snapshotError
        ? "Tabela source_snapshots inacessível"
        : hasLabBucket
          ? "Snapshots + bucket source-files"
          : "Snapshots de pesquisa no banco",
    });
  } catch {
    checks.unshift({ id: "db", labelKey: "db", status: "failed", detail: "Falha ao consultar o banco" });
    checks.push({ id: "rls", labelKey: "rls", status: "failed", detail: "Não verificado" });
    checks.push({ id: "demoSeed", labelKey: "demoSeed", status: "failed", detail: "Não verificado" });
    checks.push({ id: "storage", labelKey: "storage", status: "failed", detail: "Não verificado" });
    checks.push({ id: "migrations", labelKey: "migrations", status: "failed", detail: "Não verificado" });
    checks.push({ id: "realKnowledge", labelKey: "realKnowledge", status: "failed", detail: "Não verificado" });
    checks.push({ id: "latestResearch", labelKey: "latestResearch", status: "failed", detail: "Não verificado" });
  }

  return { version, openaiConfigured, checks };
}
