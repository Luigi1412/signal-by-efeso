import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function ActionsRedirect({ params }: PageProps<"/companies/[slug]/actions">) {
  const { slug } = await params;
  redirect(`${routes.company(slug)}#riscos`);
}
