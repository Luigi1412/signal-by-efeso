import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import { getSidebarUser } from "@/server/services/analysis-service";

export const metadata: Metadata = { title: ui.accountPage.title };
export const dynamic = "force-dynamic";

function loginMethodLabel(provider: string | null): string {
  if (!provider) return "—";
  if (provider === "google") return "Google";
  if (provider === "email") return "Email";
  return provider;
}

export default async function AccountPage() {
  const [access, user] = await Promise.all([requireEfesoAccess(), getSidebarUser()]);

  const rows: { label: string; value: string }[] = [
    { label: ui.accountPage.name, value: user.name || "—" },
    { label: ui.accountPage.email, value: access.email || "—" },
    { label: ui.accountPage.role, value: access.role },
    { label: ui.accountPage.organization, value: user.organization || "—" },
    { label: ui.accountPage.domain, value: access.emailDomain || "—" },
    {
      label: ui.accountPage.status,
      value: access.accountStatus === "invited" ? ui.accountPage.statusInvited : ui.accountPage.statusActive,
    },
    { label: ui.accountPage.loginMethod, value: loginMethodLabel(access.loginProvider) },
  ];

  return (
    <PageContainer width="narrow">
      <PageHeader title={ui.accountPage.title} description={ui.accountPage.description} className="mb-8" />
      <dl className="divide-y border-y">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-medium text-foreground sm:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </PageContainer>
  );
}
