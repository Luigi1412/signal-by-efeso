"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyValue } from "@/components/shared/key-value";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { t, ui } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  levelTone,
  opportunityConfidenceLabel,
  opportunityLevelLabel,
  opportunityMaturityLabel,
  opportunityTypeLabel,
} from "@/lib/opportunity-display";
import type { OpportunityDetail } from "@/server/opportunities/types";

const copy = ui.opportunities;

interface OpportunityDetailDrawerProps {
  detail: OpportunityDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeHref: string;
  companySlug?: string;
}

function block(detail: OpportunityDetail, type: string): string | null {
  return detail.rationaleBlocks.find((row) => row.rationaleType === type)?.statement ?? null;
}

export function OpportunityDetailDrawer({
  detail,
  open,
  onOpenChange,
  closeHref,
  companySlug,
}: OpportunityDetailDrawerProps) {
  const router = useRouter();
  if (!detail) return null;
  const slug = companySlug ?? detail.companySlug;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) router.replace(closeHref, { scroll: false });
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[560px]">
        <SheetHeader className="gap-3 border-b px-6 pt-6 pb-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{detail.companyName}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={levelTone(detail.relevanceLevel)} dot={false} size="sm">
              {copy.relevance}: {opportunityLevelLabel(detail.relevanceLevel)}
            </StatusBadge>
            <Badge variant="outline">
              {copy.urgency}: {opportunityLevelLabel(detail.urgencyLevel)}
            </Badge>
            <Badge variant="outline">{opportunityMaturityLabel(detail.maturity)}</Badge>
            {detail.demoOrigin ? (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {copy.demoOrigin}
              </Badge>
            ) : null}
          </div>
          <SheetTitle className="text-lg leading-snug tracking-tight">{detail.title}</SheetTitle>
          <SheetDescription className="sr-only">{t(copy.drawerAria, { title: detail.title })}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-8 px-6 py-6">
          <section>
            <h3 className="text-sm font-semibold">{copy.hypothesis}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail.summary}</p>
          </section>
          <section>
            <h3 className="text-sm font-semibold">{copy.knownTitle}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {[block(detail, "signal_trigger"), block(detail, "account_context"), block(detail, "efeso_relevance"), block(detail, "urgency_reason"), block(detail, "supporting_case")]
                .filter((item): item is string => Boolean(item?.trim()))
                .slice(0, 5)
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold">{copy.whyNow}</h3>
            <p className="mt-2 text-sm leading-relaxed">{block(detail, "urgency_reason") ?? block(detail, "signal_trigger")}</p>
          </section>
          <section>
            <h3 className="text-sm font-semibold">{copy.accountContext}</h3>
            <p className="mt-2 text-sm leading-relaxed">{block(detail, "account_context")}</p>
          </section>
          <section>
            <h3 className="text-sm font-semibold">{copy.whyEfeso}</h3>
            <p className="mt-2 text-sm leading-relaxed">{block(detail, "efeso_relevance")}</p>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {detail.knowledge.map((object) => (
                <li key={`${object.id}-${object.relationshipType}`}>
                  {object.name} · {object.objectType}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold">{copy.supportingSignals}</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {detail.signals.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`${routes.companyTab(slug, "signals")}?signal=${item.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="text-muted-foreground"> · {item.relationshipType}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold">{copy.relevantKnowledge}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{block(detail, "supporting_case")}</p>
          </section>
          <section>
            <h3 className="text-sm font-semibold">{copy.uncertainty}</h3>
            <p className="mt-2 rounded-md border border-hypothesis-border bg-hypothesis-muted/60 px-3 py-2 text-sm">
              {block(detail, "uncertainty") ?? detail.uncertaintyStatement}
            </p>
          </section>
          <details className="rounded-lg border bg-muted/20 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">{copy.viewProvenance ?? copy.provenance}</summary>
            <dl className="mt-3 grid gap-3">
              <KeyValue label={copy.type}>{opportunityTypeLabel(String(detail.opportunityType))}</KeyValue>
              <KeyValue label={copy.confidence}>{opportunityConfidenceLabel(detail.confidenceTier)}</KeyValue>
              <KeyValue label={copy.hypothesis}>{detail.id}</KeyValue>
              <KeyValue label={copy.provenance}>{detail.originCandidateId ?? "—"}</KeyValue>
              <KeyValue label={ui.efesoKnowledge.modelRun}>{detail.originModelRunId ?? "—"}</KeyValue>
            </dl>
          </details>
          <p className="text-xs text-muted-foreground">{copy.noAction}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
