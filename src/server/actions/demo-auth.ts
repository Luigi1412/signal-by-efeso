"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isDemoAuthMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoAccount } from "@/server/demo-bootstrap";
import { routes } from "@/lib/routes";
import { isAllowedCorporateEmail, getAllowedEmailDomains } from "@/server/access/email-domains";

function publicAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("fetch") || message.includes("ECONNREFUSED") || message.includes("Failed to fetch")) {
    return "Supabase local não está em execução. Rode npm run supabase:start e tente de novo.";
  }
  return "Não foi possível entrar. Verifique as credenciais e tente novamente.";
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ error: string } | void> {
  if (!isSupabaseConfigured()) {
    return { error: "O Supabase local não está configurado." };
  }
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Não foi possível autenticar com estas credenciais." };
  } catch (error) {
    return { error: publicAuthError(error) };
  }

  const allowed = getAllowedEmailDomains();
  if (!isAllowedCorporateEmail(email, allowed)) {
    redirect(routes.accessRestricted);
  }
  redirect(routes.companies);
}

export async function signInDemo(kind: "member" | "admin" = "member"): Promise<{ error: string } | void> {
  if (!isDemoAuthMode()) {
    return { error: "O modo de demonstração não está ativo." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "O Supabase local não está configurado." };
  }

  try {
    const { email, password } = await ensureDemoAccount(kind);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Não foi possível iniciar a sessão de demonstração." };
  } catch (error) {
    return { error: publicAuthError(error) };
  }

  redirect(routes.companies);
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Session may already be gone.
    }
  }
  redirect(routes.login);
}
