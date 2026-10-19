import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAllowedEmailDomains } from "@/server/access/email-domains";
import { SOURCE_FILES_BUCKET } from "@/server/storage/source-file-storage";
import { SIGNAL_PRODUCT_VERSION } from "@/lib/product-version";
import { getLanguageModelProviderName, getOpenAiApiKey } from "@/server/ai/config";
import { checkLanguageModelProviderHealth } from "@/server/ai/language-model-health";
import { getExternalResearchProviderName, getTavilyApiKey } from "@/server/external-research/config";

export type HealthStatus = "ok" | "missing" | "pending" | "failed";

export interface ReleaseHealthCheck {
  id: string;
  labelKey:
    | "application"
    | "db"
    | "auth"
    | "domain"
    | "demoSeed"
    | "openai"
    | "liveTest"
    | "languageProvider"
    | "ollama"
    | "ollamaModel"
    | "localAiSmoke"
    | "tavily"
    | "externalResearch"
    | "storage"
    | "migrations"
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

  const checks: ReleaseHealthCheck[] = [
    {
      id: "application",
      labelKey: "application",
      status: "ok",
      detail: "healthy",
    },
    {
      id: "auth",
      labelKey: "auth",
      status: authConfigured ? "ok" : "missing",
      detail: authConfigured ? "healthy" : "Variáveis públicas do Supabase ausentes",
    },
    {
      id: "domain",
      labelKey: "domain",
      status: domains.length > 0 ? "ok" : "missing",
      detail: domains.length > 0 ? `${domains.length} domínio(s) configurado(s)` : "ALLOWED_EMAIL_DOMAINS vazio",
    },
    {
      id: "languageProvider",
      labelKey: "languageProvider",
      status: providerName === "fake" ? "failed" : "ok",
      detail: providerName === "ollama" ? "Ollama — disponível" : providerName === "openai" ? "OpenAI" : "fake (não usar na UX)",
    },
    {
      id: "ollama",
      labelKey: "ollama",
      status: providerName !== "ollama" ? "pending" : lm.reachable ? "ok" : "failed",
      detail: providerName !== "ollama" ? "O provedor atual não é Ollama" : lm.reachable ? "healthy" : lm.detail,
    },
    {
      id: "ollamaModel",
      labelKey: "ollamaModel",
      status: providerName !== "ollama" ? "pending" : lm.modelInstalled ? "ok" : "missing",
      detail: lm.model ? `${lm.model}${lm.modelInstalled ? " — available" : " ausente"}` : "Nenhum modelo Ollama configurado",
    },
    {
      id: "localAiSmoke",
      labelKey: "localAiSmoke",
      status: providerName === "ollama" && lm.reachable && lm.modelInstalled ? "ok" : providerName === "ollama" ? "missing" : "pending",
      detail:
        providerName === "ollama" && lm.reachable && lm.modelInstalled
          ? "healthy — smoke estruturado via npm run test:ai-local"
          : "Execute npm run test:ai-local para o smoke estruturado",
    },
    {
      id: "externalResearch",
      labelKey: "externalResearch",
      status: tavilyReady ? "ok" : "missing",
      detail: tavilyReady ? "healthy" : "Provedor de pesquisa externa não configurado",
    },
    {
      id: "tavily",
      labelKey: "tavily",
      status: tavilyReady ? "ok" : "missing",
      detail: tavilyReady ? "healthy" : "Tavily não configurado",
    },
    {
      id: "openai",
      labelKey: "openai",
      status: "pending",
      detail: openaiConfigured ? "optional / not funded" : "optional / unavailable",
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
      status: "ok",
      detail: version,
    },
  ];

  if (!authConfigured) {
    checks.unshift({ id: "db", labelKey: "db", status: "missing", detail: "Supabase não configurado" });
    checks.push({ id: "demoSeed", labelKey: "demoSeed", status: "missing", detail: "Não verificado" });
    checks.push({ id: "storage", labelKey: "storage", status: "missing", detail: "Não verificado" });
    checks.push({ id: "migrations", labelKey: "migrations", status: "missing", detail: "Não verificado" });
    return { version, openaiConfigured, checks };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("slug")
      .in("slug", ["natura", "vale", "raizen"]);
    if (companyError) throw companyError;
    const slugs = new Set((companies ?? []).map((row) => row.slug));
    const demoOk = slugs.has("natura") && slugs.has("vale") && slugs.has("raizen");
    checks.splice(2, 0, { id: "db", labelKey: "db", status: "ok", detail: "healthy" });
    checks.push({
      id: "demoSeed",
      labelKey: "demoSeed",
      status: demoOk ? "ok" : "missing",
      detail: demoOk ? "Natura, Vale e Raízen persistidas" : "Contas demo incompletas",
    });

    const { error: schemaError } = await supabase.from("efeso_fits").select("id").limit(1);
    checks.push({
      id: "migrations",
      labelKey: "migrations",
      status: schemaError ? "failed" : "ok",
      detail: schemaError ? "Esquema de aderência EFESO ausente ou inacessível" : "Esquema de V1 presente",
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
          ? "Snapshots de pesquisa no banco. Bucket source-files presente para upload de laboratório."
          : "Snapshots de pesquisa persistidos no banco (source_snapshots). O bucket source-files é só para upload de laboratório e não entra no fluxo da CEO.",
    });
  } catch {
    checks.unshift({ id: "db", labelKey: "db", status: "failed", detail: "Falha ao consultar o banco" });
    checks.push({ id: "demoSeed", labelKey: "demoSeed", status: "failed", detail: "Não verificado" });
    checks.push({ id: "storage", labelKey: "storage", status: "failed", detail: "Não verificado" });
    checks.push({ id: "migrations", labelKey: "migrations", status: "failed", detail: "Não verificado" });
  }

  return { version, openaiConfigured, checks };
}
