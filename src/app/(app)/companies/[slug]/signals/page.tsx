import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function SignalsRedirect({ params }: PageProps<"/companies/[slug]/signals">) {
  const { slug } = await params;
  redirect(`${routes.company(slug)}#achados`);
}
