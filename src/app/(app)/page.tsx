import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/** Empresas is the member home after login. */
export default function HomePage() {
  redirect(routes.companies);
}
