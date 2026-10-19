import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { actionPriorityLabel, actionTypeLabel, priorityTone } from "@/lib/action-display";
import type { RecommendedActionListItem } from "@/server/recommended-actions/types";

export function RecommendedActionPreview({
  action,
  companySlug,
}: {
  action: RecommendedActionListItem;
  companySlug: string;
}) {
  return (
    <article className="rounded-lg border bg-card p-4">
      <StatusBadge tone={priorityTone(action.priority)} dot={false} size="sm">
        {ui.actions.priority}: {actionPriorityLabel(action.priority)}
      </StatusBadge>
      <h3 className="mt-3 text-sm font-semibold">{action.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{actionTypeLabel(action.actionType)}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {action.ownerName ?? ui.actions.ownerUnknown}
      </p>
      <Link
        href={routes.companyTab(companySlug, "actions")}
        className="mt-3 inline-block text-xs font-medium underline-offset-4 hover:underline"
      >
        {ui.actions.open}
      </Link>
    </article>
  );
}
