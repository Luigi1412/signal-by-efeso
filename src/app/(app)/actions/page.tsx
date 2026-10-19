import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/** Compatibility redirect — próximos passos live on company workspace / Home. */
export default function GlobalActionsRedirectPage() {
  redirect(`${routes.home}#proximos-passos`);
}
