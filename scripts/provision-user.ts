/** Authorize one exact address; create a passwordless Auth identity. No credentials or emails are generated here. */
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { getAllowedEmailDomains, extractEmailDomain, isAllowedCorporateEmail } from "../src/server/access/email-domains";
import { isWorkspaceRole } from "../src/server/access/roles";
import type { Database } from "../src/types/database";
for (const path of [".env.local", ".env"]) if (existsSync(path)) loadEnvFile(path);
class ProvisioningError extends Error {}
function arg(name: string) { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]; }
async function main() {
  const email = arg("email")?.trim().toLowerCase() ?? "";
  if (!extractEmailDomain(email)) throw new ProvisioningError("Informe --email com um endereço válido.");
  const external = !isAllowedCorporateEmail(email, getAllowedEmailDomains());
  if (external && !process.argv.includes("--approve-external-address")) throw new ProvisioningError("Endereço externo exige --approve-external-address. Isso não libera outros endereços do domínio.");
  if (!getAllowedEmailDomains().length) throw new ProvisioningError("Configure ALLOWED_EMAIL_DOMAINS antes de provisionar.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new ProvisioningError("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local não versionado.");
  const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: workspace, error: wsError } = await admin.from("workspaces").select("id").eq("slug", "efeso-brazil").eq("status", "active").single();
  if (wsError || !workspace) throw new ProvisioningError("Workspace EFESO ativo não encontrado. Aplique migrations e inicialize o workspace real.");
  const { data: current, error: lookupError } = await admin.from("workspace_authorized_emails").select("role,status,external_access_approved").eq("workspace_id", workspace.id).eq("email", email).maybeSingle();
  if (lookupError) throw new ProvisioningError("Allowlist indisponível. Verifique a migration 052.");
  if (current?.status === "disabled" && !process.argv.includes("--reactivate")) throw new ProvisioningError("Endereço revogado; use --reactivate somente se quiser restaurar seu acesso.");
  const role = arg("role") ?? current?.role ?? "member";
  if (!isWorkspaceRole(role)) throw new ProvisioningError("Perfil inválido.");
  const { error } = await admin.from("workspace_authorized_emails").upsert({
    workspace_id: workspace.id, email, role, status: current?.status === "active" ? "active" : "invited",
    external_access_approved: external && process.argv.includes("--approve-external-address"),
  }, { onConflict: "workspace_id,email" });
  if (error) throw new ProvisioningError("Não foi possível autorizar o endereço.");
  const created = await admin.auth.admin.createUser({ email, email_confirm: false });
  if (created.error && !["email_exists", "user_already_exists"].includes(created.error.code ?? "")) {
    throw new ProvisioningError("Allowlist salva, mas Auth não confirmou a criação. Verifique o usuário no painel Supabase Auth.");
  }
  console.log(`READY: ${email} (${role}) na allowlist; Auth ${created.error ? "já existente" : "criado sem senha"}.`);
  console.log("O usuário deve abrir /login e solicitar seu próprio link. A ativação exige a confirmação do e-mail; nenhuma sessão foi criada por este script.");
}
main().catch((error) => { if (error instanceof ProvisioningError) console.error(error.message); console.error("Provisionamento não concluído. Execute npm run check:real e verifique workspace, migration 052 e Auth. Nenhuma senha foi gerada."); process.exitCode = 1; });
