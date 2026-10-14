import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/types";
import { EvidenceTypeBadge } from "./status-badge";

interface MetricCardProps {
  value: string;
  label: string;
  note?: string;
  type?: EvidenceType;
  /** Compact variant for inline metric strips. */
  compact?: boolean;
  className?: string;
}

export function MetricCard({ value, label, note, type, compact = false, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 rounded-lg border bg-card",
        compact ? "px-4 py-3" : "p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {type && <EvidenceTypeBadge type={type} size="sm" />}
      </div>
      <div>
        <div className={cn("tabular font-semibold tracking-tight text-foreground", compact ? "text-2xl" : "text-[28px] leading-none")}>
          {value}
        </div>
        {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

/** Minimal inline metric for dense strips (no card chrome). */
export function MetricInline({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="tabular text-2xl font-semibold tracking-tight text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
