import { History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { VersionCard } from "@/components/versions/version-card";
import { WorkspaceUnavailable } from "@/components/workspace/workspace-unavailable";
import { getVersionsForCompany } from "@/data";
import { t, ui } from "@/i18n";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";
import type { AnalysisVersion } from "@/types";

export function generateStaticParams() {
  return workspaceStaticParams();
}

/** Simulated version appended when the user completes a Refine Analysis action. */
function buildRefinedVersion(companyId: string, previous: AnalysisVersion[]): AnalysisVersion {
  return {
    id: "ver-simulated",
    companyId,
    version: "v1.3",
    isCurrent: true,
    dateLabel: "14 out. 2026",
    date: "2026-10-14T16:05:00-03:00",
    author: "Mariana Costa",
    summary: ui.versions.simulatedSummary,
    changes: [
      { id: "sim-01", text: ui.versions.simulatedChange1 },
      { id: "sim-02", text: ui.versions.simulatedChange2 },
      { id: "sim-03", text: t(ui.versions.simulatedChange3, { count: previous.length }) },
    ],
  };
}

export default async function VersionsPage({ params, searchParams }: PageProps<"/companies/[slug]/versions">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { company, analysis } = resolveWorkspace(slug);

  if (!analysis) {
    return <WorkspaceUnavailable company={company} section={ui.workspace.tabs.versions} />;
  }

  const stored = getVersionsForCompany(company.id);
  const refined = query.refined === "1";
  const versions = refined
    ? [buildRefinedVersion(company.id, stored), ...stored.map((v) => ({ ...v, isCurrent: false }))]
    : stored;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={ui.versions.eyebrow}
        title={ui.versions.title}
        description={ui.versions.description}
      />

      {versions.length === 0 ? (
        <EmptyState icon={History} title={ui.versions.emptyTitle} description={ui.versions.emptyDescription} />
      ) : (
        <ol className="max-w-3xl">
          {versions.map((version, index) => (
            <VersionCard
              key={version.id}
              version={version}
              companySlug={company.slug}
              isLast={index === versions.length - 1}
              justCreated={refined && index === 0}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
