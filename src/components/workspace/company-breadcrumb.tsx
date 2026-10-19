"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ui } from "@/i18n";
import { routes, workspaceTabs, type WorkspaceTabId } from "@/lib/routes";

export function CompanyBreadcrumb({ slug, companyName }: { slug: string; companyName: string }) {
  const pathname = usePathname();
  const base = routes.company(slug);
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : "";
  const segment = rest.split("/")[0];
  const tab = (workspaceTabs.find((id) => id === segment) ?? "overview") as WorkspaceTabId;
  const tabLabel = tab !== "overview" ? ui.workspace.tabs[tab] : null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground print:hidden">
      <Link href={routes.companies} className="hover:text-foreground">
        {ui.workspace.breadcrumbCompanies}
      </Link>
      <ChevronRight className="size-3" />
      {tabLabel ? (
        <>
          <Link href={base} className="hover:text-foreground">
            {companyName}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{tabLabel}</span>
        </>
      ) : (
        <span className="text-foreground">{companyName}</span>
      )}
    </nav>
  );
}
