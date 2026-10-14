import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DemoLoginButton } from "@/components/auth/demo-login-button";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { isDemoAuthMode } from "@/lib/supabase/env";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: ui.login.title };
export const dynamic = "force-dynamic";

export default function LoginPage() {
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

          <div className="mt-10">
            {isDemoAuthMode() ? (
              <DemoLoginButton />
            ) : (
              <Button asChild variant="brand" size="lg" className="h-11 w-full justify-between px-4 text-sm sm:w-auto sm:min-w-72">
                <Link href={routes.home}>
                  {ui.login.cta}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{ui.login.restricted}</p>
          </div>
        </div>
      </main>

      <footer className="flex h-14 items-center justify-between px-6 text-xs text-muted-foreground sm:px-10">
        <span>{ui.demo.prototypeVersion}</span>
        <span>{ui.demo.notice}</span>
      </footer>
    </div>
  );
}
