import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Globe, MapPin, Network } from "lucide-react";
import { PageContainer } from "@/components/layout/page-header";
import { KeyValue } from "@/components/shared/key-value";
import { RelevanceBadge } from "@/components/shared/status-badge";
import { ConfirmCompanyButton } from "@/components/analysis/confirm-company-button";
import { Button } from "@/components/ui/button";
import { getCompanies, getCompanyBySlug } from "@/data";
import { t, ui } from "@/i18n";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: ui.resolve.title };

export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: c.slug }));
}

export default async function ResolveCompanyPage({
  params,
  searchParams,
}: PageProps<"/analysis/[slug]/resolve">) {
  const { slug } = await params;
  const query = await searchParams;
  const analysisId = typeof query.analysis === "string" ? query.analysis : undefined;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();

  return (
    <PageContainer width="narrow" className="pt-12 lg:pt-20">
      <div className="eyebrow mb-3">{ui.resolve.eyebrow}</div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{ui.resolve.headline}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{ui.resolve.supporting}</p>

      <div className="mt-8 overflow-hidden rounded-lg border bg-card">
        <div className="flex items-start gap-4 p-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{company.legalName}</h2>
              <RelevanceBadge relevance={company.brazilRelevance} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span>{company.industry}</span>
              <span aria-hidden>·</span>
              <span>{company.country}</span>
              {company.parentGroup && (
                <>
                  <span aria-hidden>·</span>
                  <span>{t(ui.resolve.partOf, { group: company.parentGroup })}</span>
                </>
              )}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{company.description}</p>
          </div>
        </div>

        <div className="grid gap-5 border-t bg-muted/30 px-6 py-5 sm:grid-cols-3">
          <KeyValue label={ui.resolve.website}>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="size-3.5 text-muted-foreground" />
              {company.website}
            </span>
          </KeyValue>
          <KeyValue label={ui.resolve.headquarters}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground" />
              {company.headquarters}
            </span>
          </KeyValue>
          <KeyValue label={ui.resolve.group}>
            <span className="inline-flex items-center gap-1.5">
              <Network className="size-3.5 text-muted-foreground" />
              {company.parentGroup ?? ui.resolve.independent}
            </span>
          </KeyValue>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={routes.newAnalysis}>{ui.resolve.chooseAnother}</Link>
        </Button>
        <ConfirmCompanyButton slug={company.slug} analysisId={analysisId} />
      </div>
    </PageContainer>
  );
}
