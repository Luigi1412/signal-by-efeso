import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = join(root, "supabase/seed_demo.sql");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

async function ensureAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<string> {
  const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase());
  if (!existing) {
    const created = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (created.error) throw created.error;
    if (!created.data.user) throw new Error(`Failed to create ${input.email}`);
    return created.data.user.id;
  }
  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (updated.error) throw updated.error;
  return existing.id;
}

async function ensureMembership(input: {
  userId: string;
  role: "member" | "admin";
  fullName: string;
  jobTitle: string;
}) {
  const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", "efeso-brazil")
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace) throw new Error("Workspace efeso-brazil is missing. Run npm run supabase:reset first.");

  const { error: profileError } = await admin.from("profiles").upsert({
    id: input.userId,
    full_name: input.fullName,
    job_title: input.jobTitle,
    preferred_locale: "pt-BR",
  });
  if (profileError) throw profileError;

  const { data: membership, error: lookupError } = await admin
    .from("workspace_memberships")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!membership) {
    const { error } = await admin.from("workspace_memberships").insert({
      workspace_id: workspace.id,
      user_id: input.userId,
      role: input.role,
      status: "active",
      provisioned_reason: "demo_seed",
    });
    if (error) throw error;
    return;
  }
  const { error } = await admin
    .from("workspace_memberships")
    .update({ role: input.role, status: "active", provisioned_reason: "demo_seed" })
    .eq("id", membership.id);
  if (error) throw error;
}

function applyDemoSql() {
  if (!existsSync(sqlPath)) throw new Error(`Missing ${sqlPath}`);
  const dbUrl = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const npx = spawnSync("npx", ["supabase", "db", "query", "-f", sqlPath], {
      cwd: root,
      encoding: "utf8",
    });
    if (npx.status !== 0) {
      throw new Error(result.stderr || npx.stderr || "Failed to apply seed_demo.sql");
    }
  }
}

async function main() {
  const password = required("DEMO_AUTH_PASSWORD");
  const memberId = await ensureAuthUser({
    email: "demo.member@efeso.com",
    password,
    fullName: "Demo Member",
  });
  const adminId = await ensureAuthUser({
    email: "demo.admin@efeso.com",
    password,
    fullName: "Demo Admin",
  });
  await ensureAuthUser({
    email: "outsider@gmail.com",
    password,
    fullName: "External User",
  });
  await ensureMembership({
    userId: memberId,
    role: "member",
    fullName: "Demo Member",
    jobTitle: "Consultor",
  });
  await ensureMembership({
    userId: adminId,
    role: "admin",
    fullName: "Demo Admin",
    jobTitle: "Administrador",
  });
  applyDemoSql();
  console.log("Demo seed applied.");
  console.log("Accounts (synthetic): demo.member@efeso.com, demo.admin@efeso.com");
  console.log("Negative-test account (no membership): outsider@gmail.com");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
