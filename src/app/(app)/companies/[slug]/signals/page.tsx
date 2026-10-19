import { Radio } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { SignalFeed } from "@/components/signals/signal-feed";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getSignalDetail, getSignalsForCompanySlug } from "@/server/services/signal-service";
import type { SignalDetail, SignalListItem } from "@/server/signals/types";
import { SIGNAL_IMPORTANCE_LEVELS, SIGNAL_TYPES } from "@/server/signals/taxonomy";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SignalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  resolveWorkspace(slug);

  const filters = {
    query: first(query.q),
    companyId: "",
    signalType: first(query.type),
    importance: first(query.importance),
    geography: first(query.geography),
    assertionMode: first(query.assertion),
    dateFrom: first(query.from),
    dateTo: first(query.to),
  };
  const signalId = first(query.signal);
  const signalType = SIGNAL_TYPES.includes(filters.signalType as never) ? filters.signalType : null;
  const importance = SIGNAL_IMPORTANCE_LEVELS.includes(filters.importance as never) ? filters.importance : null;

  let persisted: SignalListItem[] | null = null;
  let selected: SignalDetail | null = null;
  let persistenceError = false;
  try {
    persisted = await getSignalsForCompanySlug(slug);
    persisted = persisted.filter((item) => {
      if (signalType && item.signalType !== signalType) return false;
      if (importance && item.importance !== importance) return false;
      if (filters.assertionMode && item.assertionMode !== filters.assertionMode) return false;
      if (filters.geography && (item.geography ?? "") !== filters.geography) return false;
      if (filters.query) {
        const hay = `${item.title} ${item.summary}`.toLowerCase();
        if (!hay.includes(filters.query.toLowerCase())) return false;
      }
      return true;
    });
    selected = signalId ? await getSignalDetail(signalId) : null;
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  if (!persistenceError && persisted) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow={ui.signals.eyebrow} title={ui.signals.title} description={ui.signals.description} />
        <SignalFeed
          items={persisted}
          selected={selected && selected.companySlug === slug ? selected : null}
          companies={[]}
          filters={filters}
          formAction={routes.companyTab(slug, "signals")}
          hideCompanyFilter
          asOfDate={new Date().toISOString().slice(0, 10)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading eyebrow={ui.signals.eyebrow} title={ui.signals.title} description={ui.signals.description} />
      <EmptyState icon={Radio} title={ui.signals.emptyTitle} description={ui.signals.emptyDescription} />
    </div>
  );
}
