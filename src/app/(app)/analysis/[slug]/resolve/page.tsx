import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
/** All identity confirmation goes through the public-evidence research flow. */
export default function LegacyResolvePage() { redirect(routes.researchNew); }
