import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { getReleaseHealth, type HealthStatus } from "@/server/services/release-health-service";

export const metadata: Metadata = { title: ui.admin.releaseHealth.title };
export const dynamic = "force-dynamic";

const statusLabel: Record<HealthStatus, string> = {
  ok: ui.admin.releaseHealth.ok,
  missing: ui.admin.releaseHealth.missing,
  pending: ui.admin.releaseHealth.pending,
  failed: ui.admin.releaseHealth.failed,
};

export default async function ReleaseHealthPage() {
  const snapshot = await getReleaseHealth();
  const labels = ui.admin.releaseHealth;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        className="mb-8"
      />
      <ul className="divide-y rounded-lg border bg-card">
        {snapshot.checks.map((check) => (
          <li key={check.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{labels[check.labelKey]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
            </div>
            <span className="text-xs font-medium tracking-wide uppercase">{statusLabel[check.status]}</span>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
