import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DemoNotice } from "@/components/shared/demo-notice";
import { AnalysisStatusBadge } from "@/components/shared/status-badge";
import { ui } from "@/i18n";
import { geographyLabel, researchFocusLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { Analysis, Company } from "@/types";
import { WorkspaceActions } from "./workspace-actions";
import { WorkspaceTabs } from "./workspace-tabs";

interface CompanyWorkspaceHeaderProps {
  company: Company;
  analysis?: Analysis;
}

export function CompanyWorkspaceHeader({ company, analysis }: CompanyWorkspaceHeaderProps) {
  return (
    <div className="border-b bg-card print:hidden">
      <div className="mx-auto w-full max-w-[1400px] px-5 pt-5 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground print:hidden">
            <Link href={routes.companies} className="hover:text-foreground">
              {ui.workspace.breadcrumbCompanies}
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{company.name}</span>
          </nav>
          <DemoNotice inline className="print:hidden" />
        </div>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
              {analysis && <AnalysisStatusBadge status={analysis.status} />}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{ui.workspace.subtitle}</p>

            <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <dt>{ui.workspace.analysis}</dt>
                <dd className="tabular font-medium text-foreground">v{analysis?.version ?? "—"}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>{ui.workspace.updated}</dt>
                <dd className="font-medium text-foreground">{analysis?.updatedAtLabel ?? "—"}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>{ui.workspace.focus}</dt>
                <dd className="font-medium text-foreground">
                  {analysis ? researchFocusLabel[analysis.focus] : "—"}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>{ui.workspace.geography}</dt>
                <dd className="font-medium text-foreground">
                  {analysis ? geographyLabel[analysis.geography] : geographyLabel.Brazil}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <WorkspaceActions companySlug={company.slug} />
          </div>
        </div>

        <div className="mt-5">
          <WorkspaceTabs companySlug={company.slug} />
        </div>
      </div>
    </div>
  );
}
