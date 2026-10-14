import Link from "next/link";
import { GitCommitHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { t, ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { AnalysisVersion } from "@/types";

interface VersionCardProps {
  version: AnalysisVersion;
  companySlug: string;
  isLast?: boolean;
  /** Highlights a version that was just created by a Refine action. */
  justCreated?: boolean;
}

export function VersionCard({ version, companySlug, isLast = false, justCreated = false }: VersionCardProps) {
  return (
    <li className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border bg-card",
            version.isCurrent ? "border-foreground text-foreground" : "text-muted-foreground",
          )}
        >
          <GitCommitHorizontal className="size-3.5" />
        </span>
        {!isLast && <span className="w-px flex-1 bg-border" aria-hidden />}
      </div>

      <article
        className={cn(
          "mb-5 flex-1 rounded-lg border bg-card transition-colors",
          version.isCurrent && "border-foreground/30",
          justCreated && "animate-in fade-in-0 slide-in-from-top-1 duration-300",
        )}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="tabular text-base font-semibold tracking-tight text-foreground">{version.version}</h3>
            {version.isCurrent && (
              <StatusBadge tone="brand" dot={false}>
                {ui.versions.current}
              </StatusBadge>
            )}
            {justCreated && (
              <StatusBadge tone="verified" dot={false}>
                {ui.versions.justCreated}
              </StatusBadge>
            )}
            <span className="text-sm text-muted-foreground">{version.dateLabel}</span>
            <span className="text-xs text-muted-foreground">{t(ui.versions.by, { author: version.author })}</span>
          </div>
          <Button asChild variant={version.isCurrent ? "default" : "outline"} size="sm">
            <Link href={routes.company(companySlug)}>{ui.versions.view}</Link>
          </Button>
        </header>

        <div className="border-t px-5 py-4">
          <p className="text-sm text-foreground">{version.summary}</p>
          <div className="eyebrow mt-3 mb-1.5">{ui.versions.changes}</div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {version.changes.map((change) => (
              <li key={change.id} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-[9px] size-1 shrink-0 rounded-full bg-foreground/50" aria-hidden />
                {change.text}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </li>
  );
}
