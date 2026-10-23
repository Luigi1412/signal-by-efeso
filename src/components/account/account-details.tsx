import { LogoutButton } from "@/components/auth/logout-button";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";

export function AccountDetails({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <PageContainer width="narrow">
      <PageHeader title={ui.accountPage.title} description={ui.accountPage.description} className="mb-8" />
      <dl className="divide-y border-y">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="break-words text-sm font-medium text-foreground sm:max-w-[65%] sm:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </PageContainer>
  );
}
