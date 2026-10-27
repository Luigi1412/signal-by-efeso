import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Brand } from "@/components/layout/brand";
import { ui } from "@/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: ui.login.title };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const available = isSupabaseConfigured();
  let signedIn = false;
  if (available) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      signedIn = Boolean(data.user);
    } catch { /* Service errors leave the login surface available. */ }
  }
  // Keep redirects outside the catch. A Supabase identity alone is not authorization.
  if (signedIn) {
    await requireEfesoAccess();
    redirect(routes.companies);
  }
  const query = await searchParams;
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === "true";
  return <div className="login-page">
    <aside className="login-introduction">
      <Brand href={null} />
      <div><p className="eyebrow">Inteligência de empresas</p><h1>Entenda o movimento.<br />Encontre o que importa.</h1><p>Fatos, movimentos e implicações operacionais para decisões mais bem fundamentadas.</p></div>
      <p className="login-signature">SIGNAL by EFESO · Uso interno</p>
    </aside>
    <main className="login-access">
      <div className="login-mobile-brand"><Brand href={null} /></div>
      <div className="w-full max-w-sm">
        <p className="eyebrow mb-4">Acesso autorizado</p><h2>Entre no SIGNAL</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Use o e-mail autorizado para acessar seu workspace.</p>
        {!available && <p role="status" className="mt-6 border-l-2 border-brand pl-4 text-sm leading-relaxed text-muted-foreground">O serviço de acesso ainda não está disponível. Entre em contato com o administrador.</p>}
        {query.expired === "1" && <p role="status" className="mt-5 text-sm text-muted-foreground">{ui.login.sessionExpired}</p>}
        <div className="mt-8"><LoginForm available={available} googleEnabled={googleEnabled} /></div>
        <p className="mt-8 border-t pt-5 text-xs leading-relaxed text-muted-foreground">O acesso depende de autorização individual. O domínio do e-mail, por si só, não concede permissão.</p>
      </div>
    </main>
  </div>;
}
