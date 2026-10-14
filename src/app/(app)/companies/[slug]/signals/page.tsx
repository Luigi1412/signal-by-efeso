import { Radio } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { SignalCard } from "@/components/signals/signal-card";
import { WorkspaceUnavailable } from "@/components/workspace/workspace-unavailable";
import { getSignalsForCompany } from "@/data";
import { t, ui } from "@/i18n";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export default async function SignalsPage({ params }: PageProps<"/companies/[slug]/signals">) {
  const { slug } = await params;
  const { company, analysis } = resolveWorkspace(slug);

  if (!analysis) {
    return <WorkspaceUnavailable company={company} section={ui.workspace.tabs.signals} />;
  }

  const signals = getSignalsForCompany(company.id);
  const verified = signals.filter((s) => s.type === "verified").length;
  const derived = signals.length - verified;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={ui.signals.eyebrow}
        title={ui.signals.title}
        description={ui.signals.description}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone="verified">{t(ui.signals.verifiedCount, { count: verified })}</StatusBadge>
            <StatusBadge tone="derived">{t(ui.signals.derivedCount, { count: derived })}</StatusBadge>
          </div>
        }
      />

      {signals.length === 0 ? (
        <EmptyState icon={Radio} title={ui.signals.emptyTitle} description={ui.signals.emptyDescription} />
      ) : (
        <ol className="flex flex-col gap-7">
          {signals.map((signal, index) => (
            <SignalCard key={signal.id} signal={signal} companySlug={company.slug} isLast={index === signals.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
}
