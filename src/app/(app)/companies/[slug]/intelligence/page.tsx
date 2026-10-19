import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { AccountIntelligencePanel } from "@/components/intelligence/account-intelligence-panel";
import { RelevantEfesoKnowledge } from "@/components/intelligence/relevant-efeso-knowledge";
import { ui } from "@/i18n";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { getAccountIntelligence, getCompanyEfesoFit, resolvePersistedCompanyId } from "@/server/services/account-query-service";
import { getSignalDetail } from "@/server/services/signal-service";
import type { AccountIntelligenceView, EfesoFitView } from "@/server/intelligence/types";
import type { SignalDetail } from "@/server/signals/types";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CompanyIntelligencePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { company } = resolveWorkspace(slug);

  let intelligence: AccountIntelligenceView | null = null;
  let fits: EfesoFitView[] = [];
  let selected: SignalDetail | null = null;
  try {
    const persistedId = await resolvePersistedCompanyId(slug);
    if (persistedId) {
      intelligence = await getAccountIntelligence(persistedId);
      fits = await getCompanyEfesoFit(persistedId);
    }
    const signalId = first(query.signal);
    selected = signalId ? await getSignalDetail(signalId) : null;
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <SectionHeading
          eyebrow={ui.accountIntelligence.eyebrow}
          title={ui.accountIntelligence.headline}
          description={ui.accountIntelligence.description}
        />
        {intelligence ? (
          <div className="mt-6">
            <AccountIntelligencePanel intelligence={intelligence} selectedSignal={selected} />
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState title={ui.accountIntelligence.empty} />
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow={ui.relevantKnowledge.eyebrow}
          title={ui.relevantKnowledge.title}
          description={ui.relevantKnowledge.description}
        />
        <div className="mt-6">
          <RelevantEfesoKnowledge fits={fits} companySlug={company.slug} />
        </div>
      </section>
    </div>
  );
}
