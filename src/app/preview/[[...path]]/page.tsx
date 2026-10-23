import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalPreviewRequest } from "@/lib/local-preview";

export const dynamic = "force-dynamic";
export const metadata = { title: "PREVIEW LOCAL · SIGNAL", robots: { index: false, follow: false } };

export default async function LocalPreviewPage({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<{ phase?: string }> }) {
  const requestHeaders = await headers();
  if (!isLocalPreviewRequest(process.env.NODE_ENV, process.env.SIGNAL_LOCAL_PREVIEW, requestHeaders.get("host"), requestHeaders.get("x-forwarded-host"), requestHeaders.get("x-forwarded-for"))) notFound();
  const { LocalPreviewApp } = await import("@/components/local-preview/app");
  const { path = [] } = await params;
  const { phase } = await searchParams;
  return <LocalPreviewApp key={path.join("/")} path={path} phase={phase} />;
}
