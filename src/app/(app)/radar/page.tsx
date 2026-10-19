import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/** Compatibility: Radar content lives on Home (§ “O que mudou”). */
export default function RadarPage() {
  redirect(`${routes.home}#o-que-mudou`);
}
