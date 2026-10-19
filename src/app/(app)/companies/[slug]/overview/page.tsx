import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function OverviewRedirect({ params }: PageProps<"/companies/[slug]/overview">) {
  const { slug } = await params;
  redirect(routes.company(slug));
}
