import { ExternalLink, FileText } from "lucide-react";
import { ui } from "@/i18n";
import { formatDate, sourceTypeLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { EvidenceSource } from "@/types";
import { StatusBadge } from "./status-badge";

interface SourceListProps {
  sources: EvidenceSource[];
  dense?: boolean;
  className?: string;
}

export function SourceList({ sources, dense = false, className }: SourceListProps) {
  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">{ui.evidence.noSources}</p>;
  }

  return (
    <ol className={cn("divide-y rounded-lg border bg-card", className)}>
      {sources.map((source, index) => (
        <li key={source.id} className={cn("flex items-start gap-3", dense ? "px-3 py-2.5" : "px-4 py-3")}>
          <span className="tabular mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-foreground">{source.title}</span>
              {source.isPrimary && (
                <StatusBadge tone="neutral" dot={false} size="sm">
                  {ui.evidence.primary}
                </StatusBadge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{source.publisher}</span>
              <span aria-hidden>·</span>
              <span>{sourceTypeLabel[source.type]}</span>
              <span aria-hidden>·</span>
              <span>{formatDate(source.publishedAt)}</span>
            </div>
            {!dense && (
              <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
                <ExternalLink className="size-3" />
                {source.url}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
