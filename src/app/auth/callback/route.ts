import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

/** Completes magic-link / OAuth code exchange, then sends the user into the app shell. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = next?.startsWith("/") ? next : routes.companies;

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(new URL(`${routes.login}?expired=1`, url.origin));
      }
    } catch {
      return NextResponse.redirect(new URL(`${routes.login}?expired=1`, url.origin));
    }
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
