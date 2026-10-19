"use client";

import { BookOpen, Building2, Home, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ui } from "@/i18n";
import { SIGNAL_PRODUCT_VERSION } from "@/lib/product-version";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types";
import { Brand } from "./brand";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { UserCard } from "./user-card";

const primaryNav: NavItem[] = [
  { label: ui.nav.home, href: routes.home, icon: Home },
  { label: ui.nav.companies, href: routes.companies, icon: Building2, matchPrefix: true },
  {
    label: ui.nav.knowledgeBase,
    href: routes.expertise,
    icon: BookOpen,
    matchPrefix: true,
    activePrefix: "/expertise",
  },
];

const adminNav: NavItem[] = [{ label: ui.nav.admin, href: routes.admin, icon: Settings2, matchPrefix: true }];

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
  user: CurrentUser;
  showAdminNav?: boolean;
}

export function AppSidebar({ className, onNavigate, user, showAdminNav = false }: AppSidebarProps) {
  return (
    <aside className={cn("flex h-full w-60 flex-col border-r bg-sidebar print:hidden", className)} data-print-hide>
      <div className="flex h-14 items-center px-4">
        <Brand />
      </div>

      <div className="flex flex-1 flex-col px-3 pt-2">
        <div className="eyebrow mb-2 px-2.5">{ui.nav.workspace}</div>
        <SidebarNav items={primaryNav} onNavigate={onNavigate} />

        {showAdminNav ? (
          <div className="mt-auto">
            <div className="eyebrow mb-2 px-2.5">{ui.nav.organization}</div>
            <SidebarNav items={adminNav} onNavigate={onNavigate} />
          </div>
        ) : (
          <div className="mt-auto" />
        )}
      </div>

      <Separator className="mt-3" />
      <div className="px-3 py-2">
        <UserCard user={user} />
        {showAdminNav ? (
          <p className="px-2 pb-1 text-[10px] text-muted-foreground">v{SIGNAL_PRODUCT_VERSION}</p>
        ) : null}
      </div>
    </aside>
  );
}
