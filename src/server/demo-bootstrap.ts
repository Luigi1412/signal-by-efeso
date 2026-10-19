import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getDemoAuthPassword } from "@/lib/supabase/env";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_JOB_TITLE,
  DEMO_ADMIN_PROFILE_NAME,
  DEMO_EXTERNAL_EMAIL,
  DEMO_MEMBER_EMAIL,
  DEMO_MEMBER_JOB_TITLE,
  DEMO_MEMBER_PROFILE_NAME,
  EFESO_BRAZIL_SLUG,
} from "@/server/constants";
import type { WorkspaceRole } from "@/server/access/roles";

export type DemoAccountKind = "member" | "admin" | "external";

const DEMO_ACCOUNTS: Record<
  DemoAccountKind,
  { email: string; fullName: string; jobTitle: string; role: WorkspaceRole | null }
> = {
  member: {
    email: DEMO_MEMBER_EMAIL,
    fullName: DEMO_MEMBER_PROFILE_NAME,
    jobTitle: DEMO_MEMBER_JOB_TITLE,
    role: "member",
  },
  admin: {
    email: DEMO_ADMIN_EMAIL,
    fullName: DEMO_ADMIN_PROFILE_NAME,
    jobTitle: DEMO_ADMIN_JOB_TITLE,
    role: "admin",
  },
  external: {
    email: DEMO_EXTERNAL_EMAIL,
    fullName: "External User",
    jobTitle: "External",
    role: null,
  },
};

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureAuthUser(input: {
  email: string;
  fullName: string;
  password: string;
}): Promise<string> {
  const admin = createAdminSupabaseClient();
  const user = await findAuthUserByEmail(admin, input.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (error) throw error;
    if (!data.user) throw new Error("Demo user creation returned no user.");
    return data.user.id;
  }
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (updateError) throw updateError;
  return user.id;
}

async function ensureDemoMembership(input: {
  userId: string;
  role: WorkspaceRole;
  fullName: string;
  jobTitle: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", EFESO_BRAZIL_SLUG)
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace) {
    throw new Error("Workspace efeso-brazil is missing. Run supabase db reset / seed.");
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: input.userId,
      full_name: input.fullName,
      job_title: input.jobTitle,
      preferred_locale: "pt-BR",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const { data: membership, error: membershipLookupError } = await admin
    .from("workspace_memberships")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (membershipLookupError) throw membershipLookupError;

  if (!membership) {
    const { error: insertError } = await admin.from("workspace_memberships").insert({
      workspace_id: workspace.id,
      user_id: input.userId,
      role: input.role,
      status: "active",
      provisioned_reason: "demo_seed",
    });
    if (insertError) throw insertError;
    return;
  }

  const { error: updateError } = await admin
    .from("workspace_memberships")
    .update({ role: input.role, status: "active", provisioned_reason: "demo_seed" })
    .eq("id", membership.id);
  if (updateError) throw updateError;
}

export async function ensureDemoAccount(
  kind: DemoAccountKind,
): Promise<{ email: string; password: string; userId: string }> {
  const account = DEMO_ACCOUNTS[kind];
  const password = getDemoAuthPassword();
  const userId = await ensureAuthUser({
    email: account.email,
    fullName: account.fullName,
    password,
  });
  if (account.role) {
    await ensureDemoMembership({
      userId,
      role: account.role,
      fullName: account.fullName,
      jobTitle: account.jobTitle,
    });
  }
  return { email: account.email, password, userId };
}

/** Default CEO Preview login is the authorized member account. */
export async function ensureDemoUser(): Promise<{ email: string; password: string; userId: string }> {
  return ensureDemoAccount("member");
}
