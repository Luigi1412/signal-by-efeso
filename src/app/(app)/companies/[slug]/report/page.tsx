import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function ReportRedirect({ params }: PageProps<"/companies/[slug]/report">) {
  const { slug } = await params;
  redirect(routes.company(slug));
}
