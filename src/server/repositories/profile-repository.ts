import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/server/session";
import type { ProfileRow } from "@/types/database";

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
