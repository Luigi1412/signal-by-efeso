import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default function NewAnalysisRedirectPage() {
  redirect(routes.researchNew);
}
