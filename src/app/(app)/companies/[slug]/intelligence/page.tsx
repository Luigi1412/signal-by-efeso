import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function IntelligenceRedirect({ params }: PageProps<"/companies/[slug]/intelligence">) {
  const { slug } = await params;
  redirect(`${routes.company(slug)}#resumo`);
}
