import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/** Compatibility redirect — opportunities live on company workspace. */
export default function GlobalOpportunitiesRedirectPage() {
  redirect(routes.companies);
}
