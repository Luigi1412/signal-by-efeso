/**
 * Secure admin provisioning helper.
 * Usage:
 *   npm run user:provision -- --email someone@efeso.com --role member|admin
 *
 * Never prints passwords or tokens.
 * Prefers Supabase invite when service role is available.
 */
import { createClient } from "@supabase/supabase-js";
import { getAllowedEmailDomains, isAllowedCorporateEmail } from "../src/server/access/email-domains";

function arg(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const email = (arg("email") ?? "").trim().toLowerCase();
  const role = (arg("role") ?? "member").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("usage: npm run user:provision -- --email user@efeso.com --role member|admin");
    process.exit(1);
  }
  if (role !== "member" && role !== "admin") {
    console.error("role must be member or admin");
    process.exit(1);
  }

  const allowed = getAllowedEmailDomains();
  if (!isAllowedCorporateEmail(email, allowed)) {
    console.error("email domain not allowed");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("Supabase admin credentials missing. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Manual procedure: invite the user in the Supabase Auth dashboard, then insert membership with role.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { signal_role: role },
  });

  if (inviteError) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) {
      console.error("provision failed (invite unavailable and listUsers failed)");
      process.exit(1);
    }
    const existing = listed.users.find((user) => user.email?.toLowerCase() === email);
    if (!existing) {
      console.error("provision failed:", inviteError.message);
      console.error("Use Supabase Auth invite in the dashboard, then assign membership/role.");
      process.exit(1);
    }
    await upsertMembership(admin, existing.id, role);
    console.log(`ok: membership ensured for existing user (${role})`);
    return;
  }

  const userId = inviteData.user?.id;
  if (!userId) {
    console.error("invite returned no user id");
    process.exit(1);
  }
  await upsertMembership(admin, userId, role);
  console.log(`ok: invite sent and membership set (${role})`);
}

async function upsertMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  role: string,
) {
  const { data: workspaces, error: wsError } = await admin.from("workspaces").select("id").limit(1);
  if (wsError || !workspaces?.[0]) {
    throw new Error("workspace lookup failed");
  }
  const workspaceId = workspaces[0].id as string;
  const { error } = await admin.from("workspace_memberships").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role,
    },
    { onConflict: "workspace_id,user_id" },
  );
  if (error) {
    console.error("membership upsert failed — assign role manually in admin SQL after invite");
    throw error;
  }
}

main().catch((error) => {
  console.error("provision failed");
  if (error instanceof Error && !/password|token|key|secret/i.test(error.message)) {
    console.error(error.message);
  }
  process.exit(1);
});
