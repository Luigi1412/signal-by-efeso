import { AppShell } from "@/components/layout/app-shell";
import { getSidebarUser } from "@/server/services/analysis-service";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSidebarUser();
  return <AppShell user={user}>{children}</AppShell>;
}
