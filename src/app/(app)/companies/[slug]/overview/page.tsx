import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { workspaceStaticParams } from "@/lib/workspace";

export function generateStaticParams() {
  return workspaceStaticParams();
}

/** `/companies/[slug]/overview` is an alias of the workspace root. */
export default async function OverviewAliasPage({ params }: PageProps<"/companies/[slug]/overview">) {
  const { slug } = await params;
  redirect(routes.company(slug));
}
