import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { SignalFeed } from "@/components/signals/signal-feed";
import { EmptyState } from "@/components/shared/empty-state";
import { ui } from "@/i18n";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getSignalDetail, searchSignals } from "@/server/services/signal-service";
import { listCompaniesForWorkspace } from "@/server/signals/persistence";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import type { SignalDetail, SignalListItem } from "@/server/signals/types";
import { SIGNAL_IMPORTANCE_LEVELS, SIGNAL_TYPES } from "@/server/signals/taxonomy";

export const metadata: Metadata = { title: ui.signals.globalTitle };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function GlobalSignalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireEfesoAccess();
  const query = await searchParams;
  const filters = {
    query: first(query.q),
    companyId: first(query.company),
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

  let items: SignalListItem[] = [];
  let selected: SignalDetail | null = null;
  let companies: { id: string; displayName: string }[] = [];
  let persistenceError = false;
  try {
    const workspace = await workspaceRepository.getCurrentWorkspace();
    items = await searchSignals({
      query: filters.query || null,
      companyId: filters.companyId || null,
      signalType,
      importance,
      geography: filters.geography || null,
      assertionMode: filters.assertionMode || null,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      status: "active",
    });
    selected = signalId ? await getSignalDetail(signalId) : null;
    companies = workspace
      ? (await listCompaniesForWorkspace(workspace.id)).map((row) => ({ id: row.id, displayName: row.display_name }))
      : [];
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.signals.globalEyebrow}
        title={ui.signals.globalTitle}
        description={ui.signals.globalDescription}
        className="mb-8"
      />
      {persistenceError ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <SignalFeed
          items={items}
          selected={selected}
          companies={companies}
          filters={{ ...filters }}
          layout="radar"
          asOfDate={new Date().toISOString().slice(0, 10)}
        />
      )}
    </PageContainer>
  );
}
