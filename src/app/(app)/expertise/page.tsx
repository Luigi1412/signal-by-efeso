import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EfesoKnowledgeExplorer } from "@/components/knowledge/efeso-knowledge-explorer";
import { ui } from "@/i18n";
import { getEfesoKnowledgeObject, listTaxonomyOptions, searchEfesoKnowledge } from "@/server/services/efeso-knowledge-service";
import { KNOWLEDGE_OBJECT_STATUSES, KNOWLEDGE_OBJECT_TYPES } from "@/server/knowledge/taxonomy";
import { EmptyState } from "@/components/shared/empty-state";
import { requireEfesoAccess } from "@/server/access/require-efeso-access";
import { isPersistenceUnavailable } from "@/server/persistence-error";
import { EXPERTISE_SECTIONS, isExpertiseSectionId, matchesExpertiseSection } from "@/lib/knowledge-display";

export const metadata: Metadata = { title: ui.efesoKnowledge.title };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ExpertisePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireEfesoAccess();

  const query = await searchParams;
  const filters = {
    query: first(query.q),
    objectType: first(query.type),
    industry: first(query.industry),
    capability: first(query.capability),
    businessProblem: first(query.problem),
    geography: first(query.geography),
    status: first(query.status) || "active",
  };
  const objectId = first(query.object);
  const section = isExpertiseSectionId(first(query.section)) ? first(query.section) : "";
  const objectType = KNOWLEDGE_OBJECT_TYPES.includes(filters.objectType as never) ? filters.objectType : null;
  const status = KNOWLEDGE_OBJECT_STATUSES.includes(filters.status as never) ? filters.status : "active";

  let persistenceError = false;
  let items: Awaited<ReturnType<typeof searchEfesoKnowledge>> = [];
  let categoryCounts: Record<string, number> = {};
  let taxonomy: Awaited<ReturnType<typeof listTaxonomyOptions>> = {
    industries: [],
    capabilities: [],
    problems: [],
    geographies: [],
  };
  let selected: Awaited<ReturnType<typeof getEfesoKnowledgeObject>> = null;
  try {
    const shared = {
      query: filters.query || null,
      industry: filters.industry || null,
      capability: filters.capability || null,
      businessProblem: filters.businessProblem || null,
      geography: filters.geography || null,
      status,
      limit: 400,
    };
    const [filtered, catalog, taxonomyResult, selectedResult] = await Promise.all([
      searchEfesoKnowledge({ ...shared, objectType }),
      searchEfesoKnowledge({ ...shared, objectType: null }),
      listTaxonomyOptions(),
      objectId ? getEfesoKnowledgeObject(objectId) : Promise.resolve(null),
    ]);
    items = objectType
      ? filtered
      : section
        ? catalog.filter((item) => matchesExpertiseSection({ catalogSection: item.catalogSection ?? null, objectType: item.objectType }, section))
        : filtered;
    taxonomy = taxonomyResult;
    selected = selectedResult;
    categoryCounts = Object.fromEntries(
      EXPERTISE_SECTIONS.map((row) => [
        row.id,
        catalog.filter((item) =>
          matchesExpertiseSection({ catalogSection: item.catalogSection ?? null, objectType: item.objectType }, row.id),
        ).length,
      ]),
    );
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    persistenceError = true;
  }

  return (
    <PageContainer>
      <PageHeader title={ui.efesoKnowledge.headline} description={ui.efesoKnowledge.description} className="mb-8" />
      {persistenceError ? (
        <EmptyState title={ui.persistence.unavailable} />
      ) : (
        <EfesoKnowledgeExplorer
          items={items}
          selected={selected}
          taxonomy={taxonomy}
          categoryCounts={categoryCounts}
          filters={{ ...filters, objectType: objectType ?? "", status, section }}
        />
      )}
    </PageContainer>
  );
}
