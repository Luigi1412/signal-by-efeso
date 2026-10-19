"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";
import { Brand } from "./brand";

import type { CurrentUser } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  user: CurrentUser;
  showAdminNav?: boolean;
}

/** Persistent sidebar on desktop; collapsible sheet on small screens. */
export function AppShell({ children, user, showAdminNav = false }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh print:min-h-0">
      <div className="sticky top-0 hidden h-dvh shrink-0 print:hidden lg:block">
        <AppSidebar user={user} showAdminNav={showAdminNav} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm print:hidden lg:hidden">
          <Brand />
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)} aria-label="Abrir navegação">
            <Menu />
          </Button>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0 sm:max-w-60" showCloseButton={false}>
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <AppSidebar
            user={user}
            showAdminNav={showAdminNav}
            className="border-r-0"
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
