import { AppShell } from "@/components/layout/app-shell";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import { getSidebarUser } from "@/server/services/analysis-service";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const access = await requireEfesoAccess();
  const user = await getSidebarUser();
  return (
    <AppShell user={user} showAdminNav={access.isAdmin}>
      {children}
    </AppShell>
  );
}
