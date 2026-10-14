"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isDemoAuthMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoUser } from "@/server/demo-bootstrap";
import { routes } from "@/lib/routes";

export async function signInDemo(): Promise<{ error: string } | void> {
  if (!isDemoAuthMode()) {
    return { error: "O modo de demonstração não está ativo." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "O Supabase local não está configurado." };
  }

  try {
    const { email, password } = await ensureDemoUser();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar a sessão de demonstração.";
    if (message.includes("fetch") || message.includes("ECONNREFUSED") || message.includes("Failed to fetch")) {
      return { error: "Supabase local não está em execução. Rode npm run supabase:start e tente de novo." };
    }
    return { error: message };
  }

  redirect(routes.home);
}
