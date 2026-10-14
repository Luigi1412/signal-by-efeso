"use client";

import { useEffect, useState } from "react";
import { ui } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ReportSection } from "@/types";

interface ReportNavigationProps {
  sections: Pick<ReportSection, "id" | "number" | "title">[];
}

/** Sticky internal table of contents with scroll-spy. */
export function ReportNavigation({ sections }: ReportNavigationProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(`report-${s.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id.replace("report-", ""));
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={ui.report.contents} className="flex flex-col gap-0.5 print:hidden">
      <div className="eyebrow mb-2 px-2">{ui.report.contents}</div>
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <a
            key={section.id}
            href={`#report-${section.id}`}
            aria-current={active ? "location" : undefined}
            className={cn(
              "flex items-baseline gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("tabular w-5 shrink-0 text-[11px]", active ? "text-brand" : "text-muted-foreground/70")}>{section.number}</span>
            <span className="truncate">{section.title}</span>
          </a>
        );
      })}
    </nav>
  );
}
