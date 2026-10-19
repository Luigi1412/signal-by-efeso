"use client";

import { t, ui } from "@/i18n";
import { confidenceLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  /** 0–100, or null when confidence cannot be responsibly assigned. */
  value: number | null;
  showLabel?: boolean;
  className?: string;
}

/** Numeric evidence confidence with a qualitative band. Not a strength meter. */
export function ConfidenceIndicator({ value, showLabel = true, className }: ConfidenceIndicatorProps) {
  const label = confidenceLabel(value);
  const aria = t(ui.confidence.aria, { value: value ?? "—" });

  return (
    <span
      tabIndex={0}
      title={ui.confidence.tooltip}
      className={cn("inline-flex cursor-help items-center gap-2 outline-none", className)}
      aria-label={aria}
    >
      {value === null ? (
        <span className="tabular text-sm text-muted-foreground">—</span>
      ) : (
        <span className="tabular text-sm font-medium text-foreground">{value}</span>
      )}
      {showLabel && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}
