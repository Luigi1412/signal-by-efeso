import { PrintOnLoad } from "@/components/report/print-on-load";
import { ReportNavigation } from "@/components/report/report-navigation";
import { ReportSection } from "@/components/report/report-section";
import { DemoNotice } from "@/components/shared/demo-notice";
import { WorkspaceActions } from "@/components/workspace/workspace-actions";
import { WorkspaceUnavailable } from "@/components/workspace/workspace-unavailable";
import { getReportForCompany } from "@/data";
import { getReportLocale, t, ui } from "@/i18n";
import { researchFocusLabel } from "@/lib/labels";
import { resolveWorkspace, workspaceStaticParams } from "@/lib/workspace";

export function generateStaticParams() {
  return workspaceStaticParams();
}

export default async function ReportPage({ params, searchParams }: PageProps<"/companies/[slug]/report">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { company, analysis } = resolveWorkspace(slug);
  const sections = getReportForCompany(company.id, getReportLocale());
  const shouldPrint = query.print === "1";

  if (!analysis || sections.length === 0) {
    return <WorkspaceUnavailable company={company} section={ui.workspace.tabs.report} />;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-14 print:block">
      {shouldPrint && <PrintOnLoad />}
      <aside className="hidden lg:block print:hidden">
        <div className="sticky top-8">
          <ReportNavigation sections={sections} />
        </div>
      </aside>

      <article className="min-w-0 max-w-3xl print:max-w-none">
        <header className="mb-10 flex flex-col gap-6 border-b pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="eyebrow mb-2">{t(ui.report.kicker, { version: analysis.version })}</div>
              <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-foreground">
                {t(ui.report.title, { company: company.name })}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(ui.report.prepared, {
                  date: analysis.updatedAtLabel,
                  focus: researchFocusLabel[analysis.focus],
                })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 print:hidden">
              <WorkspaceActions companySlug={company.slug} downloadLabel={ui.workspace.downloadPdf} />
            </div>
          </div>
          <DemoNotice className="print:hidden" />
        </header>

        <div className="flex flex-col gap-14">
          {sections.map((section) => (
            <ReportSection key={section.id} section={section} companySlug={company.slug} />
          ))}
        </div>

        <footer className="mt-16 border-t pt-6 text-xs text-muted-foreground">{ui.report.footer}</footer>
      </article>
    </div>
  );
}
