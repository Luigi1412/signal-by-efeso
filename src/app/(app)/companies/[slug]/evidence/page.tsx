import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function EvidenceRedirect({ params }: PageProps<"/companies/[slug]/evidence">) {
  const { slug } = await params;
  redirect(`${routes.company(slug)}#fontes`);
}
