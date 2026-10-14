import { notFound } from "next/navigation";
import { CompanyWorkspaceHeader } from "@/components/workspace/company-workspace-header";
import { getAnalysisForCompany, getCompanies, getCompanyBySlug } from "@/data";
import { ui } from "@/i18n";

export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: LayoutProps<"/companies/[slug]">) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  return { title: company ? company.name : ui.companies.columns.company };
}

export default async function CompanyWorkspaceLayout({ children, params }: LayoutProps<"/companies/[slug]">) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();

  const analysis = getAnalysisForCompany(company.id);

  return (
    <div className="flex min-h-full flex-col">
      <CompanyWorkspaceHeader company={company} analysis={analysis} />
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-8 sm:px-8 lg:px-10 print:max-w-none print:px-0 print:py-0">
        {children}
      </div>
    </div>
  );
}
