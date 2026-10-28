"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isDemoAuthMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDemoAccount } from "@/server/demo-bootstrap";
import { routes } from "@/lib/routes";
import { getAllowedEmailDomains, isEligibleAccessEmail } from "@/server/access/email-domains";
import { getAuthorizedEmail } from "@/server/access/authorized-emails";
import { logMagicLinkFailure, magicLinkFailureMessage } from "@/server/access/magic-link-diagnostics";

function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:3000";
}

function publicAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("fetch") || message.includes("ECONNREFUSED") || message.includes("Failed to fetch")) {
    return "O serviço de acesso está indisponível. Tente novamente mais tarde.";
  }
  return "Não foi possível entrar. Verifique as credenciais e tente novamente.";
}

export async function signInWithMagicLink(input: {
  email: string;
}): Promise<{ error: string } | { ok: true; message: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "O serviço de acesso ainda não está configurado. Entre em contato com o administrador." };
  }
  const email = input.email.trim().toLowerCase();
  if (!email) return { error: "Informe seu e-mail autorizado." };

  try {
    const authorization = await getAuthorizedEmail(email);
    if (!authorization || authorization.status === "disabled" || !isEligibleAccessEmail(email, getAllowedEmailDomains(), authorization.externalAccessApproved)) {
      return { error: "Acesso disponível apenas para e-mails previamente autorizados. Entre em contato com o administrador." };
    }
  } catch {
    return { error: "Não foi possível verificar a autorização. Tente novamente mais tarde." };
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
    if (error) {
      logMagicLinkFailure(error);
      return { error: magicLinkFailureMessage(error) };
    }
  } catch (error) {
    logMagicLinkFailure(error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("fetch") || message.includes("ECONNREFUSED") || message.includes("Failed to fetch") || message.includes("aborted")) {
      return { error: "O serviço de acesso está indisponível. Tente novamente mais tarde." };
    }
    return { error: magicLinkFailureMessage(error) };
  }

  return {
    ok: true,
    message: "Enviamos um link de acesso para o seu e-mail. Abra-o para entrar no SIGNAL.",
  };
}

export async function signInWithGoogle(): Promise<{ error: string } | void> {
  if (!isSupabaseConfigured()) {
    return { error: "O serviço de acesso ainda não está configurado. Entre em contato com o administrador." };
  }
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() !== "true") {
    return { error: "Login com Google não está disponível neste ambiente." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appOrigin()}/auth/callback`,
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
    return { error: "O serviço de acesso ainda não está configurado. Entre em contato com o administrador." };
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

  try {
    const authorization = await getAuthorizedEmail(email);
    if (!authorization || authorization.status === "disabled" || !isEligibleAccessEmail(email, getAllowedEmailDomains(), authorization.externalAccessApproved)) {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut({ scope: "local" });
      return { error: "Este e-mail não possui autorização de acesso ao SIGNAL." };
    }
  } catch {
    return { error: "Não foi possível verificar sua autorização." };
  }
  redirect(routes.companies);
}

export async function signInDemo(kind: "member" | "admin" = "member"): Promise<{ error: string } | void> {
  if (!isDemoAuthMode()) {
    return { error: "O modo de demonstração não está ativo." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "O serviço de acesso ainda não está configurado. Entre em contato com o administrador." };
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
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Session may already be gone.
    }
  }
  // End this browser session even if the remote Auth service cannot be reached.
  const store = await cookies();
  for (const cookie of store.getAll()) if (cookie.name.startsWith("sb-") && /auth-token|code-verifier/.test(cookie.name)) store.delete(cookie.name);
  redirect(routes.login);
}
