import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-header";
import { ExternalResearchProgress } from "@/components/research/external-research-progress";
import { ui } from "@/i18n";
import { getExternalResearchAction } from "@/server/actions/external-research-actions";

export const metadata: Metadata = { title: ui.externalResearch.headline };
export const dynamic = "force-dynamic";
export const maxDuration = 800;

export default async function ExternalResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getExternalResearchAction(id);
  if (!result.ok) notFound();

  return (
    <PageContainer className="pt-12 lg:pt-16">
      <ExternalResearchProgress initial={result.run} />
    </PageContainer>
  );
}
