import { DemoBadge } from "@/components/shared/demo-badge";
import { ui } from "@/i18n";
import type { Company } from "@/types";
import type { WorkspaceHeaderAnalysis } from "@/server/services/analysis-service";
import { WorkspaceActions } from "./workspace-actions";
import { CompanyBreadcrumb } from "./company-breadcrumb";

interface CompanyWorkspaceHeaderProps {
  company: Company;
  analysis?: WorkspaceHeaderAnalysis;
  lastResearchedAtLabel?: string | null;
  outcomeLabel?: string | null;
  statusLabel?: string | null;
}

export function CompanyWorkspaceHeader({
  company,
  analysis,
  lastResearchedAtLabel,
  outcomeLabel,
  statusLabel,
}: CompanyWorkspaceHeaderProps) {
  const meta = [company.industry, company.country, company.website].filter(Boolean).join(" · ");

  return (
    <div className="border-b bg-card print:hidden">
      <div className="mx-auto w-full max-w-3xl px-5 pt-5 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CompanyBreadcrumb slug={company.slug} companyName={company.name} />
          <DemoBadge className="print:hidden" />
        </div>

        <div className="mt-4 flex flex-col gap-4 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
            {meta ? <p className="mt-1 text-sm text-muted-foreground">{meta}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {lastResearchedAtLabel ? (
                <span>
                  {ui.workspace.lastResearched}: <span className="font-medium text-foreground">{lastResearchedAtLabel}</span>
                </span>
              ) : analysis?.updatedAtLabel ? (
                <span>
                  {ui.workspace.updated}: <span className="font-medium text-foreground">{analysis.updatedAtLabel}</span>
                </span>
              ) : null}
              {outcomeLabel ? (
                <span>
                  Resultado: <span className="font-medium text-foreground">{outcomeLabel}</span>
                </span>
              ) : null}
              {statusLabel ? (
                <span>
                  Status: <span className="font-medium text-foreground">{statusLabel}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <WorkspaceActions companySlug={company.slug} companyName={company.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
