import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
/** Legacy simulated progress is never a member research result. */
export default async function LegacyResearchPage({params}:PageProps<"/analysis/[slug]/research">) {
  const {slug}=await params;
  redirect(routes.company(slug));
}
