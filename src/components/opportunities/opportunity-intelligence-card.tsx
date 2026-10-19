import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { opportunityLevelLabel, opportunityMaturityLabel, levelTone } from "@/lib/opportunity-display";
import type { OpportunityListItem } from "@/server/opportunities/types";

const copy = ui.opportunities;

interface OpportunityIntelligenceCardProps {
  item: OpportunityListItem;
  href: string;
  showCompany?: boolean;
}

export function OpportunityIntelligenceCard({ item, href, showCompany = true }: OpportunityIntelligenceCardProps) {
  return (
    <article className="rounded-lg border bg-card transition-colors hover:border-foreground/20">
      <div className="flex flex-col gap-2 p-5">
        {showCompany ? <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.companyName}</p> : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{item.title}</h3>
          {item.demoOrigin ? (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {copy.demoOrigin}
            </Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <StatusBadge tone={levelTone(item.relevanceLevel)} dot={false} size="sm">
            {copy.relevance}: {opportunityLevelLabel(item.relevanceLevel)}
          </StatusBadge>
          <span>
            {copy.urgency}: {opportunityLevelLabel(item.urgencyLevel)}
          </span>
          <span aria-hidden>·</span>
          <span>
            {copy.maturity}: {opportunityMaturityLabel(item.maturity)}
          </span>
        </p>
        {item.primaryCapability ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {copy.primaryCapability}: {item.primaryCapability}
          </p>
        ) : null}
        {item.uncertaintyStatement ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {copy.uncertainty}: {item.uncertaintyStatement}
          </p>
        ) : null}
      </div>
      <div className="border-t px-5 py-3">
        <Link href={href} className="text-sm font-medium underline-offset-4 hover:underline">
          {copy.open}
        </Link>
      </div>
    </article>
  );
}
