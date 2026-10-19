import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function VersionsRedirect({ params }: PageProps<"/companies/[slug]/versions">) {
  const { slug } = await params;
  redirect(`${routes.company(slug)}#historico`);
}
