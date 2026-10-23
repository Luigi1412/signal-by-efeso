import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isLocalPreviewRequest } from "@/lib/local-preview";

/** Next.js 16 proxy (formerly middleware) — refresh the Supabase Auth session. */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/preview" || path.startsWith("/preview/")) {
    if (!isLocalPreviewRequest(process.env.NODE_ENV, process.env.SIGNAL_LOCAL_PREVIEW, request.headers.get("host"), request.headers.get("x-forwarded-host"), request.headers.get("x-forwarded-for"))) return new NextResponse(null, { status: 404 });
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
