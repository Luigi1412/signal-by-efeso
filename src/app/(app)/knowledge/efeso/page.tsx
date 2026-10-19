import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function EfesoKnowledgeAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const next = first(value);
    if (next) params.set(key, next);
  }
  const qs = params.toString();
  redirect(qs ? `${routes.expertise}?${qs}` : routes.expertise);
}
