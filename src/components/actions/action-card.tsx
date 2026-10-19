import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { actionPriorityLabel, priorityTone, relationshipStrengthLabel } from "@/lib/action-display";
import type { RecommendedActionListItem } from "@/server/recommended-actions/types";

const copy = ui.actions;

export function ActionCard({ item, href }: { item: RecommendedActionListItem; href: string }) {
  return (
    <article className="rounded-lg border bg-card">
      <div className="flex flex-col gap-2 p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.companyName}</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold tracking-tight">{item.title}</h3>
          <StatusBadge tone={priorityTone(item.priority)} dot={false} size="sm">
            {actionPriorityLabel(item.priority)}
          </StatusBadge>
        </div>
        {item.opportunityTitle ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {copy.linkedOpportunity}: {item.opportunityTitle}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {copy.relationshipContext}: {item.relationshipStrength ? relationshipStrengthLabel(item.relationshipStrength) : copy.relationshipUnknown}
        </p>
        <p className="text-sm text-muted-foreground">
          {copy.owner}: {item.ownerName ?? copy.ownerUnknown}
        </p>
        {item.uncertaintyStatement ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {copy.uncertainty}: {item.uncertaintyStatement}
          </p>
        ) : null}
        {item.demoOrigin ? (
          <Badge variant="outline" className="w-fit font-normal text-muted-foreground">
            {copy.demoOrigin}
          </Badge>
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
