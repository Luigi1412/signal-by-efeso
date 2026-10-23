import type { Metadata } from "next";
import { AccountDetails } from "@/components/account/account-details";
import { ui } from "@/i18n";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import { getSidebarUser } from "@/server/services/analysis-service";

export const metadata: Metadata = { title: ui.accountPage.title };
export const dynamic = "force-dynamic";

function loginMethodLabel(provider: string | null): string {
  if (!provider) return "—";
  if (provider === "google") return "Google";
  if (provider === "email") return "E-mail";
  return provider;
}

export default async function AccountPage() {
  const [access, user] = await Promise.all([requireEfesoAccess(), getSidebarUser()]);

  const rows: { label: string; value: string }[] = [
    { label: ui.accountPage.name, value: user.name || "—" },
    { label: ui.accountPage.email, value: access.email || "—" },
    { label: ui.accountPage.role, value: ({member:"Membro",consultant:"Consultor",manager:"Gerente",partner:"Sócio",admin:"Administrador"} as Record<string,string>)[access.role] ?? access.role },
    { label: ui.accountPage.organization, value: user.organization || "—" },
    { label: ui.accountPage.domain, value: access.emailDomain || "—" },
    {
      label: ui.accountPage.status,
      value: access.accountStatus === "invited" ? ui.accountPage.statusInvited : ui.accountPage.statusActive,
    },
    { label: ui.accountPage.loginMethod, value: loginMethodLabel(access.loginProvider) },
  ];

  return <AccountDetails rows={rows} />;
}
