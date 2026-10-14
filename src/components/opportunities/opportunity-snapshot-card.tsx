import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { opportunityStrengthLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/types";

interface OpportunitySnapshotCardProps {
  opportunity: Opportunity;
  companySlug: string;
  /** Lead card gets more visual weight. */
  emphasis?: "lead" | "default" | "muted";
}

export function OpportunitySnapshotCard({ opportunity, companySlug, emphasis = "default" }: OpportunitySnapshotCardProps) {
  const href = `${routes.companyTab(companySlug, "opportunities")}#${opportunity.id}`;
  const isLead = emphasis === "lead";
  const isMuted = emphasis === "muted";

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between gap-6 rounded-lg border p-5 transition-colors outline-none",
        "hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring/40",
        isLead ? "bg-foreground text-background hover:border-foreground" : "bg-card",
        isMuted && "bg-card/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={cn(
              "text-[11px] font-medium tracking-[0.08em] uppercase",
              isLead ? "text-background/60" : "text-muted-foreground",
            )}
          >
            {opportunityStrengthLabel(opportunity.score)}
          </div>
          <h3 className={cn("mt-1.5 font-semibold tracking-tight", isLead ? "text-lg" : "text-[15px]", isMuted && "text-foreground/80")}>
            {opportunity.shortTitle}
          </h3>
        </div>
        <ArrowUpRight className={cn("size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100", isLead ? "text-background/70" : "text-muted-foreground")} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className={cn("tabular font-semibold tracking-tight", isLead ? "text-4xl" : "text-[28px] leading-none", isMuted && "text-foreground/70")}>
            {opportunity.score}
          </span>
          <span className={cn("text-sm", isLead ? "text-background/60" : "text-muted-foreground")}>/ 100</span>
        </div>
        <ScoreBar score={opportunity.score} inverted={isLead} muted={isMuted} />
      </div>
    </Link>
  );
}

function ScoreBar({ score, inverted, muted }: { score: number; inverted: boolean; muted: boolean }) {
  return (
    <div className={cn("h-1 w-20 overflow-hidden rounded-full", inverted ? "bg-background/15" : "bg-foreground/8")} aria-hidden>
      <div
        className={cn("h-full rounded-full", inverted ? "bg-background" : muted ? "bg-foreground/40" : "bg-foreground")}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
