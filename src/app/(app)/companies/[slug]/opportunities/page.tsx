import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function OpportunitiesRedirect({ params }: PageProps<"/companies/[slug]/opportunities">) {
  const { slug } = await params;
  redirect(`${routes.company(slug)}#oportunidades`);
}
