import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: ui.accessRestricted.title };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AccessRestrictedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const reason = first(query.reason);
  const copy =
    reason === "admin"
      ? { title: ui.accessRestricted.title, body: ui.accessRestricted.adminBody }
      : reason === "provision"
        ? { title: ui.accessRestricted.title, body: ui.accessRestricted.provisionBody }
        : { title: ui.accessRestricted.title, body: ui.accessRestricted.body };

  let signedIn = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      signedIn = Boolean(data.user);
    } catch {
      signedIn = false;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Brand href={null} />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md">
          <div className="eyebrow mb-5">{ui.accessRestricted.eyebrow}</div>
          <h1 className="text-[32px] leading-[1.12] font-semibold tracking-tight text-foreground sm:text-[38px]">
            {copy.title}
          </h1>
          <p className="mt-4 text-base text-muted-foreground">{copy.body}</p>
          <p className="mt-3 text-sm text-muted-foreground">{ui.accessRestricted.hint}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild variant="brand">
              <Link href={routes.login}>{ui.accessRestricted.backToLogin}</Link>
            </Button>
            {signedIn ? <LogoutButton /> : null}
          </div>
        </div>
      </main>

      <footer className="flex h-14 items-center px-6 text-xs text-muted-foreground sm:px-10">
        <span>{ui.demo.prototypeVersion}</span>
      </footer>
    </div>
  );
}
