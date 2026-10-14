import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { getSourceById } from "@/data";
import { t, ui } from "@/i18n";
import { sourceTypeLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Conflict } from "@/types";

interface ConflictCardProps {
  conflict: Conflict;
  compact?: boolean;
  className?: string;
}

/** Responsible-intelligence presentation of a source conflict. Not an error state. */
export function ConflictCard({ conflict, compact = false, className }: ConflictCardProps) {
  return (
    <article className={cn("overflow-hidden rounded-lg border border-conflict-border bg-card", className)}>
      <header className={cn("flex items-start justify-between gap-3 border-b border-conflict-border/70 bg-conflict-muted/50", compact ? "px-4 py-3" : "px-5 py-4")}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-conflict" />
          <div>
            <h3 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-sm" : "text-[15px]")}>{conflict.topic}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(ui.evidence.conflictDetected, { count: conflict.positions.length })}
            </p>
          </div>
        </div>
        <StatusBadge tone="conflict">{ui.evidenceType.conflict}</StatusBadge>
      </header>

      <ol className="divide-y">
        {conflict.positions.map((position) => {
          const source = getSourceById(position.sourceId);
          return (
            <li key={position.sourceId} className={cn("grid gap-1 sm:grid-cols-[88px_1fr_56px] sm:items-baseline sm:gap-4", compact ? "px-4 py-2.5" : "px-5 py-3")}>
              <span className="text-xs font-medium text-muted-foreground">{position.label}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{position.statement}</div>
                {source && !compact && (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {source.publisher} · {sourceTypeLabel[source.type]}
                  </div>
                )}
              </div>
              <span className="tabular text-xs text-muted-foreground sm:text-right">{position.year}</span>
            </li>
          );
        })}
      </ol>

      <div className={cn("grid gap-4 border-t bg-muted/30 sm:grid-cols-2", compact ? "px-4 py-3" : "px-5 py-4")}>
        <div>
          <div className="eyebrow">{ui.evidence.conclusion}</div>
          <p className="mt-1 text-sm text-foreground">{conflict.conclusion}</p>
        </div>
        <div>
          <div className="eyebrow">{ui.evidence.decision}</div>
          <p className="mt-1 text-sm font-medium text-foreground">{conflict.decision}</p>
        </div>
      </div>
    </article>
  );
}
