import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { SearchX } from "lucide-react";

export const metadata: Metadata = { title: ui.unavailable.title };

export default async function UnavailableCompanyPage({
  searchParams,
}: PageProps<"/analysis/unavailable">) {
  const query = await searchParams;
  const requested = Array.isArray(query.q) ? query.q[0] : query.q;

  return (
    <PageContainer width="narrow" className="pt-16 lg:pt-24">
      <EmptyState
        icon={SearchX}
        title={ui.unavailable.headline}
        description={
          requested
            ? `${requested}. ${ui.unavailable.supporting}`
            : ui.unavailable.supporting
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild variant="brand" size="sm">
              <Link href={routes.analysisResolve("natura")}>{ui.unavailable.analyzeNatura}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={routes.newAnalysis}>
                <ArrowLeft data-icon="inline-start" />
                {ui.unavailable.back}
              </Link>
            </Button>
          </div>
        }
      />
    </PageContainer>
  );
}
