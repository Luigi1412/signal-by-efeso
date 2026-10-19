import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/** Compatibility redirect — primary surface is Home / company Resumo. */
export default function GlobalSignalsRedirectPage() {
  redirect(`${routes.home}#o-que-mudou`);
}
