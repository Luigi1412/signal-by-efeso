"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isDemoAuthMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoAccount } from "@/server/demo-bootstrap";
import { routes } from "@/lib/routes";
import { getAllowedEmailDomains, isAllowedCorporateEmail } from "@/server/access/email-domains";
import { getAuthorizedEmail } from "@/server/access/authorized-emails";

function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:3000";
}

function publicAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("fetch") || message.includes("ECONNREFUSED") || message.includes("Failed to fetch")) {
    return "Supabase local não está em execução. Rode npm run supabase:start e tente de novo.";
  }
  return "Não foi possível entrar. Verifique as credenciais e tente novamente.";
}

export async function signInWithMagicLink(input: {
  email: string;
}): Promise<{ error: string } | { ok: true; message: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "O Supabase local não está configurado." };
  }
  const email = input.email.trim().toLowerCase();
  if (!email) return { error: "Informe o e-mail corporativo EFESO." };

  const allowed = getAllowedEmailDomains();
  if (!isAllowedCorporateEmail(email, allowed)) {
    return { error: "Use um e-mail corporativo autorizado da EFESO." };
  }

  // Fail closed early when the email is known-not-authorized. Do not reveal other details.
  try {
    const authorized = await getAuthorizedEmail(email);
    if (!authorized || authorized.status === "disabled") {
      return {
        error:
          "Seu email pertence à EFESO, mas ainda não possui acesso ao SIGNAL. Entre em contato com o administrador.",
      };
    }
  } catch {
    // If allowlist lookup fails (e.g. migration pending), still attempt OTP — gate remains in requireEfesoAccess.
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appOrigin()}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error) return { error: "Não foi possível enviar o link de acesso. Tente novamente." };
  } catch (error) {
    return { error: publicAuthError(error) };
  }

  return {
    ok: true,
    message: "Enviamos um link de acesso para o seu e-mail. Abra-o para entrar no SIGNAL.",
  };
}

export async function signInWithGoogle(): Promise<{ error: string } | void> {
  if (!isSupabaseConfigured()) {
    return { error: "O Supabase local não está configurado." };
  }
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() !== "true") {
    return { error: "Login com Google não está disponível neste ambiente." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appOrigin()}/auth/callback`,
      queryParams: { hd: "efeso.com" },
    },
  });
  if (error || !data.url) {
    return { error: "Não foi possível iniciar o login com Google." };
  }
  redirect(data.url);
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
