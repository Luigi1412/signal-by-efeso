import { cn } from "@/lib/utils";
import type { AnalysisStatus, EvidenceType, Relevance } from "@/types";
import {
  analysisStatusLabel,
  evidenceTypeLabel,
  opportunityStrengthBand,
  opportunityStrengthLabel,
  relevanceLabel,
} from "@/lib/labels";

type Tone = "verified" | "derived" | "hypothesis" | "conflict" | "neutral" | "brand" | "strong";

const toneClasses: Record<Tone, string> = {
  verified: "bg-verified-muted text-verified border-verified-border",
  derived: "bg-derived-muted text-derived border-derived-border",
  hypothesis: "bg-hypothesis-muted text-hypothesis border-hypothesis-border",
  conflict: "bg-conflict-muted text-conflict border-conflict-border",
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-brand-muted text-brand border-brand/20",
  strong: "bg-foreground text-background border-foreground",
};

const dotClasses: Record<Tone, string> = {
  verified: "bg-verified",
  derived: "bg-derived",
  hypothesis: "bg-hypothesis",
  conflict: "bg-conflict",
  neutral: "bg-muted-foreground/60",
  brand: "bg-brand",
  strong: "bg-background",
};

interface StatusBadgeProps {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ tone, children, dot = true, size = "md", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
        size === "md" ? "h-6 px-2 text-xs" : "h-5 px-1.5 text-[11px]",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}

export function EvidenceTypeBadge({
  type,
  size,
  className,
}: {
  type: EvidenceType;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone: Tone = type === "unverified" ? "neutral" : type;
  return (
    <StatusBadge tone={tone} size={size} className={className}>
      {evidenceTypeLabel[type]}
    </StatusBadge>
  );
}

const analysisTone: Record<AnalysisStatus, Tone> = {
  ready: "verified",
  researching: "derived",
  "needs-review": "hypothesis",
  draft: "neutral",
};

export function AnalysisStatusBadge({ status, size }: { status: AnalysisStatus; size?: "sm" | "md" }) {
  return (
    <StatusBadge tone={analysisTone[status]} size={size}>
      {analysisStatusLabel[status]}
    </StatusBadge>
  );
}

export function RelevanceBadge({ relevance }: { relevance: Relevance }) {
  const tone: Tone = relevance === "high" ? "strong" : "neutral";
  return (
    <StatusBadge tone={tone} dot={false} size="sm">
      {relevanceLabel[relevance]}
    </StatusBadge>
  );
}

/** Opportunity strength band from score — not economic size. */
export function StrengthBadge({ score }: { score: number }) {
  const band = opportunityStrengthBand(score);
  const tone: Tone = band === "forte" ? "strong" : "neutral";
  return (
    <StatusBadge tone={tone} dot={false} className="tracking-wide">
      {opportunityStrengthLabel(score)}
    </StatusBadge>
  );
}
