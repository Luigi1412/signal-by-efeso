import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Brand } from "@/components/layout/brand";
import { ui } from "@/i18n";
import { isDemoAuthMode, isDemoMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { SIGNAL_PRODUCT_VERSION } from "@/lib/product-version";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { getAllowedEmailDomains, isAllowedCorporateEmail } from "@/server/access/email-domains";

export const metadata: Metadata = { title: ui.login.title };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        const allowed = getAllowedEmailDomains();
        if (isAllowedCorporateEmail(data.user.email, allowed)) {
          redirect(routes.home);
        }
        redirect(routes.accessRestricted);
      }
    } catch {
      // Show the login form when the session cannot be read.
    }
  }

  const query = await searchParams;
  const expired = query.expired === "1";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Brand href={null} />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md">
          <div className="eyebrow mb-5">{ui.login.eyebrow}</div>
          <h1 className="text-[32px] leading-[1.12] font-semibold tracking-tight text-foreground sm:text-[38px]">
            {ui.login.headline}
          </h1>
          <p className="mt-4 text-base text-muted-foreground">{ui.login.supporting}</p>
          {expired ? <p className="mt-3 text-sm text-muted-foreground">{ui.login.sessionExpired}</p> : null}

          <div className="mt-10">
            <LoginForm demoMode={isDemoAuthMode()} />
            <p className="mt-4 text-xs text-muted-foreground">{ui.login.restricted}</p>
          </div>
        </div>
      </main>

      <footer className="flex h-14 items-center justify-between px-6 text-xs text-muted-foreground sm:px-10">
        <span>Signal · v{SIGNAL_PRODUCT_VERSION}</span>
        {isDemoMode() ? <span>{ui.demo.notice}</span> : <span>{ui.login.restricted}</span>}
      </footer>
    </div>
  );
}
