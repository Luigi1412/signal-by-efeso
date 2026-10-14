import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-header";
import { ResearchProgress } from "@/components/research/research-progress";
import { getCompanies, researchFinalSummary, researchPhases } from "@/data";
import { ui } from "@/i18n";
import { getResearchContext } from "@/server/services/analysis-service";

export const metadata: Metadata = { title: ui.research.title };

export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: c.slug }));
}

export default async function ResearchPage({
  params,
  searchParams,
}: PageProps<"/analysis/[slug]/research">) {
  const { slug } = await params;
  const query = await searchParams;
  const analysisId = typeof query.analysis === "string" ? query.analysis : undefined;
  const runId = typeof query.run === "string" ? query.run : undefined;

  const context = await getResearchContext(slug, analysisId, runId);
  if (!context) notFound();

  const { company } = context;
  const phases = researchPhases.map((phase, index) =>
    index === 0 ? { ...phase, detail: `${company.legalName} · ${company.country}` } : phase,
  );

  return (
    <PageContainer className="pt-12 lg:pt-16">
      <ResearchProgress
        company={company}
        phases={phases}
        finalSummary={researchFinalSummary}
        analysisId={context.analysis?.id}
        runId={context.run?.id}
        initialCompletedCount={context.initialCompletedCount}
      />
    </PageContainer>
  );
}
