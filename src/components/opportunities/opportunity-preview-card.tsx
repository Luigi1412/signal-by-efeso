import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { opportunityLevelLabel, opportunityMaturityLabel, opportunityTypeLabel } from "@/lib/opportunity-display";
import { cn } from "@/lib/utils";
import type { OpportunityListItem } from "@/server/opportunities/types";

interface OpportunityPreviewCardProps {
  opportunity: OpportunityListItem;
  companySlug: string;
  emphasis?: "lead" | "default";
}

export function OpportunityPreviewCard({ opportunity, companySlug, emphasis = "default" }: OpportunityPreviewCardProps) {
  const href = `${routes.companyTab(companySlug, "opportunities")}#${opportunity.id}`;
  const isLead = emphasis === "lead";

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between gap-4 rounded-lg border p-5 transition-colors outline-none",
        "hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring/40",
        isLead ? "bg-foreground text-background hover:border-foreground" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn("text-[11px] font-medium tracking-[0.08em] uppercase", isLead ? "text-background/60" : "text-muted-foreground")}>
            {opportunityTypeLabel(String(opportunity.opportunityType))}
          </div>
          <h3 className={cn("mt-1.5 font-semibold tracking-tight", isLead ? "text-lg" : "text-[15px]")}>{opportunity.title}</h3>
        </div>
        <ArrowUpRight className={cn("size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100", isLead ? "text-background/70" : "text-muted-foreground")} />
      </div>
      <p className={cn("text-xs", isLead ? "text-background/70" : "text-muted-foreground")}>
        {ui.opportunities.relevance}: {opportunityLevelLabel(opportunity.relevanceLevel)} · {ui.opportunities.urgency}:{" "}
        {opportunityLevelLabel(opportunity.urgencyLevel)} · {opportunityMaturityLabel(opportunity.maturity)}
      </p>
    </Link>
  );
}
