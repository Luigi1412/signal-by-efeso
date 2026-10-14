import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  DEMO_AUTH_EMAIL,
  DEMO_MEMBERSHIP_ROLE,
  DEMO_PROFILE_JOB_TITLE,
  DEMO_PROFILE_NAME,
  EFESO_BRAZIL_SLUG,
} from "@/server/constants";
import { getDemoAuthPassword } from "@/lib/supabase/env";

/**
 * Idempotent demo provisioning. Service role only. Never import from client components.
 */
export async function ensureDemoUser(): Promise<{ email: string; password: string; userId: string }> {
  const admin = createAdminSupabaseClient();
  const password = getDemoAuthPassword();

  const { data: existing, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  let user = existing.users.find((u) => u.email === DEMO_AUTH_EMAIL);

  if (!user) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: DEMO_AUTH_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: DEMO_PROFILE_NAME },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("Demo user creation returned no user.");
    user = created.user;
  } else {
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (updateError) throw updateError;
  }

  await ensureDemoProfileAndMembership(user.id);
  return { email: DEMO_AUTH_EMAIL, password, userId: user.id };
}

export async function ensureDemoProfileAndMembership(userId: string): Promise<void> {
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
      id: userId,
      full_name: DEMO_PROFILE_NAME,
      job_title: DEMO_PROFILE_JOB_TITLE,
      preferred_locale: "pt-BR",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const { data: membership, error: membershipLookupError } = await admin
    .from("workspace_memberships")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipLookupError) throw membershipLookupError;

  if (!membership) {
    const { error: insertError } = await admin.from("workspace_memberships").insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: DEMO_MEMBERSHIP_ROLE,
      status: "active",
    });
    if (insertError) throw insertError;
  } else {
    const { error: updateError } = await admin
      .from("workspace_memberships")
      .update({ role: DEMO_MEMBERSHIP_ROLE, status: "active" })
      .eq("id", membership.id);
    if (updateError) throw updateError;
  }
}
