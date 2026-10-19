import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t, ui } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  formatSignalDate,
  formatSignalGeography,
  formatSignalSummaryForDisplay,
  formatSignalTitleForDisplay,
  signalMovementCategory,
} from "@/lib/signal-display";
import { cn } from "@/lib/utils";
import type { SignalListItem } from "@/server/signals/types";

const copy = ui.signals;

interface SignalRadarCardProps {
  item: SignalListItem;
  href: string;
  featured?: boolean;
  showCompany?: boolean;
  onOpen?: () => void;
}

function importanceTone(importance: string): "strong" | "brand" | "neutral" {
  if (importance === "high") return "strong";
  if (importance === "medium") return "brand";
  return "neutral";
}

export function SignalRadarCard({ item, href, featured = false, showCompany = true, onOpen }: SignalRadarCardProps) {
  const title = formatSignalTitleForDisplay(item.title);
  const summary = formatSignalSummaryForDisplay(item.summary);
  const movement = copy.movement[signalMovementCategory(item.signalType)];
  const intelligenceHref = item.companySlug ? routes.companyTab(item.companySlug, "intelligence") : null;

  return (
    <article
      className={cn(
        "rounded-lg border bg-card transition-colors hover:border-foreground/20",
        featured && "shadow-sm",
      )}
    >
      <div className={cn("flex flex-col gap-3", featured ? "p-5" : "p-4")}>
        {showCompany ? <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.companyName}</p> : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className={cn("font-semibold tracking-tight text-foreground", featured ? "text-base" : "text-[15px]")}>{title}</h3>
          <StatusBadge tone={importanceTone(item.importance)} dot={false} size="sm">
            {labelOf(ui.signalImportance, item.importance)}
          </StatusBadge>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{labelOf(ui.assertionMode, item.assertionMode)}</span>
          <span aria-hidden>·</span>
          <span>{formatSignalGeography(item.geography)}</span>
          <span aria-hidden>·</span>
          <time dateTime={(item.eventDate ?? item.createdAt).slice(0, 10)}>
            {formatSignalDate(item.eventDate ?? item.createdAt)}
          </time>
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{movement}</span>
          <span aria-hidden>·</span>
          <span>
            {item.evidenceCount === 1 ? copy.evidenceCountOne : t(copy.evidenceCount, { count: item.evidenceCount })}
          </span>
          {item.demoOrigin ? (
            <Badge variant="outline" className="h-5 font-normal text-muted-foreground" title={copy.demoTooltip}>
              {copy.demoOrigin}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {intelligenceHref ? (
            <Link href={intelligenceHref} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {copy.viewAccountIntelligence}
            </Link>
          ) : null}
          <Button asChild size="sm" variant={featured ? "brand" : "outline"}>
            <Link href={href} onClick={onOpen}>
              {copy.viewSignal}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
