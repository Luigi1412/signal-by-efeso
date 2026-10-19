"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ui } from "@/i18n";
import { routes, workspaceTabs, type WorkspaceTabId } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface WorkspaceTabsProps {
  companySlug: string;
}

function resolveActiveTab(pathname: string, companySlug: string): WorkspaceTabId {
  const base = routes.company(companySlug);
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : "";
  const segment = rest.split("/")[0];
  return workspaceTabs.find((id) => id === segment) ?? "overview";
}

export function WorkspaceTabs({ companySlug }: WorkspaceTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysis") ?? undefined;
  const active = resolveActiveTab(pathname, companySlug);

  return (
    <nav aria-label="Seções do workspace" className="-mb-px flex gap-1 overflow-x-auto print:hidden">
      {workspaceTabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Link
            key={tab}
            href={routes.companyTab(companySlug, tab, analysisId)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
              isActive
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {ui.workspace.tabs[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
