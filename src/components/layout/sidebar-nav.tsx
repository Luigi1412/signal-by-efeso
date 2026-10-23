"use client";

import { ScopedLink as Link, useLocalPreview } from "@/components/local-preview/runtime";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match any path beginning with href (default: exact for "/"). */
  matchPrefix?: boolean;
  /** Optional prefix used only for active-state matching. */
  activePrefix?: string;
}

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const rawPathname = usePathname();
  const preview = useLocalPreview();
  const pathname = preview ? (rawPathname.replace(/^\/preview(?=\/|$)/, "") || "/companies") : rawPathname;

  return (
    <nav className="flex flex-col gap-2">
      {items.map((item) => {
        const prefix = item.activePrefix ?? (item.matchPrefix ? item.href : undefined);
        const active = prefix
          ? pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname === item.href
          : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            {active && (
              <span aria-hidden className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-r bg-brand" />
            )}
            <item.icon className={cn("size-[15px] shrink-0", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
