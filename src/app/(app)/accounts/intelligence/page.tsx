import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default function AccountIntelligenceRedirectPage() {
  redirect(routes.companies);
}
