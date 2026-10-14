"use client";

import { BookOpen, Building2, Home, Plus, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types";
import { Brand } from "./brand";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { UserCard } from "./user-card";

const primaryNav: NavItem[] = [
  { label: ui.nav.home, href: routes.home, icon: Home },
  { label: ui.nav.companies, href: routes.companies, icon: Building2, matchPrefix: true },
  { label: ui.nav.newAnalysis, href: routes.newAnalysis, icon: Plus, activePrefix: "/analysis" },
];

const secondaryNav: NavItem[] = [
  { label: ui.nav.knowledgeBase, href: routes.knowledgeBase, icon: BookOpen, matchPrefix: true },
  { label: ui.nav.admin, href: routes.admin, icon: Settings2, matchPrefix: true },
];

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
  user: CurrentUser;
}

export function AppSidebar({ className, onNavigate, user }: AppSidebarProps) {
  return (
    <aside className={cn("flex h-full w-60 flex-col border-r bg-sidebar print:hidden", className)} data-print-hide>
      <div className="flex h-14 items-center px-4">
        <Brand />
      </div>

      <div className="flex flex-1 flex-col px-3 pt-2">
        <div className="eyebrow mb-2 px-2.5">{ui.nav.workspace}</div>
        <SidebarNav items={primaryNav} onNavigate={onNavigate} />

        <div className="mt-auto">
          <div className="eyebrow mb-2 px-2.5">{ui.nav.organization}</div>
          <SidebarNav items={secondaryNav} onNavigate={onNavigate} />
        </div>
      </div>

      <Separator className="mt-3" />
      <div className="px-3 py-2">
        <UserCard user={user} />
      </div>
    </aside>
  );
}
