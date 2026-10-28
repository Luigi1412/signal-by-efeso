import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { authCallbackDecision, callbackRedirectUrl, logAuthCallbackFailure, logMagicLinkFailure } from "@/server/access/magic-link-diagnostics";

/** Completes magic-link / OAuth code exchange, then sends the user into the app shell. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const decision = authCallbackDecision(url.searchParams);
  const redirectTo = (path: string) => NextResponse.redirect(callbackRedirectUrl(path, url.origin, process.env.NEXT_PUBLIC_APP_URL));

  if (decision.kind !== "exchange") {
    logAuthCallbackFailure(url.searchParams);
    return redirectTo(decision.path);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(decision.code);
    if (error) {
      logMagicLinkFailure(error);
      return redirectTo(`${routes.login}?expired=1`);
    }
  } catch (error) {
    logMagicLinkFailure(error);
    return redirectTo(`${routes.login}?expired=1`);
  }

  return redirectTo(decision.destination);
}
