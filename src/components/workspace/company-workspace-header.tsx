import { Suspense } from "react";
import { DemoBadge } from "@/components/shared/demo-badge";
import { ui } from "@/i18n";
import type { Company } from "@/types";
import type { WorkspaceHeaderAnalysis } from "@/server/services/analysis-service";
import { WorkspaceActions } from "./workspace-actions";
import { WorkspaceTabs } from "./workspace-tabs";
import { CompanyBreadcrumb } from "./company-breadcrumb";

interface CompanyWorkspaceHeaderProps {
  company: Company;
  analysis?: WorkspaceHeaderAnalysis;
  lastResearchedAtLabel?: string | null;
}

export function CompanyWorkspaceHeader({ company, analysis, lastResearchedAtLabel }: CompanyWorkspaceHeaderProps) {
  const stateLine = [company.industry, company.country].filter(Boolean).join(" · ");

  return (
    <div className="border-b bg-card print:hidden">
      <div className="mx-auto w-full max-w-[1400px] px-5 pt-5 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CompanyBreadcrumb slug={company.slug} companyName={company.name} />
          <DemoBadge className="print:hidden" />
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
            {stateLine ? <p className="mt-1 text-sm text-muted-foreground">{stateLine}</p> : null}
            {lastResearchedAtLabel ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {ui.workspace.lastResearched}: <span className="font-medium text-foreground">{lastResearchedAtLabel}</span>
              </p>
            ) : analysis?.updatedAtLabel ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {ui.workspace.updated}: <span className="font-medium text-foreground">{analysis.updatedAtLabel}</span>
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <WorkspaceActions companySlug={company.slug} />
          </div>
        </div>

        <div className="mt-5">
          <Suspense fallback={<div className="h-10" />}>
            <WorkspaceTabs companySlug={company.slug} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
