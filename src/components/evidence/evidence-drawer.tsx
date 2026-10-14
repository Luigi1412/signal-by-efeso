"use client";

import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator";
import { KeyValue } from "@/components/shared/key-value";
import { SourceList } from "@/components/shared/source-list";
import { EvidenceTypeBadge } from "@/components/shared/status-badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { t, ui } from "@/i18n";
import { evidenceTypeLabel, geographyLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { CompanySignal, Conflict, EvidenceClaim, EvidenceSource, Opportunity } from "@/types";
import { ConflictCard } from "./conflict-card";

interface EvidenceDrawerProps {
  claim: EvidenceClaim | null;
  sources: EvidenceSource[];
  conflict?: Conflict;
  relatedSignal?: CompanySignal;
  relatedOpportunity?: Opportunity;
  companySlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EvidenceDrawer({
  claim,
  sources,
  conflict,
  relatedSignal,
  relatedOpportunity,
  companySlug,
  open,
  onOpenChange,
}: EvidenceDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
        {claim && (
          <>
            <SheetHeader className="gap-3 border-b px-6 pt-6 pb-5">
              <div className="flex items-center gap-2">
                <EvidenceTypeBadge type={claim.type} />
                <span className="text-xs text-muted-foreground">
                  {t(ui.evidence.claimId, { id: claim.id.replace("clm-", "#") })}
                </span>
              </div>
              <SheetTitle className="text-lg leading-snug tracking-tight">{claim.claim}</SheetTitle>
              <SheetDescription className="sr-only">
                {t(ui.evidence.drawerAria, { claim: claim.claim })}
              </SheetDescription>

              <dl className="grid grid-cols-3 gap-4 pt-1">
                <KeyValue label={ui.evidence.status}>{evidenceTypeLabel[claim.type]}</KeyValue>
                <KeyValue label={ui.evidence.confidence}>
                  <ConfidenceIndicator value={claim.confidence} />
                </KeyValue>
                <KeyValue label={ui.evidence.geography}>{geographyLabel[claim.geography]}</KeyValue>
                <KeyValue label={ui.evidence.period} className="col-span-3 sm:col-span-1">
                  {claim.period}
                </KeyValue>
              </dl>
            </SheetHeader>

            <div className="flex flex-col gap-7 px-6 py-6">
              {conflict && <ConflictCard conflict={conflict} compact />}

              <DrawerSection title={ui.evidence.excerpt}>
                <blockquote className="border-l-2 border-foreground/20 pl-4 text-sm leading-relaxed text-foreground">
                  {claim.excerpt}
                </blockquote>
              </DrawerSection>

              {claim.calculation && (
                <DrawerSection title={ui.evidence.calculation} icon={<Calculator className="size-3.5 text-derived" />}>
                  <p className="rounded-md border border-derived-border bg-derived-muted/60 px-4 py-3 text-sm leading-relaxed text-foreground">
                    {claim.calculation}
                  </p>
                </DrawerSection>
              )}

              <DrawerSection title={ui.evidence.whyItMatters}>
                <p className="text-sm leading-relaxed text-muted-foreground">{claim.whyItMatters}</p>
              </DrawerSection>

              <DrawerSection title={t(ui.evidence.sources, { count: sources.length })}>
                <SourceList sources={sources} dense />
              </DrawerSection>

              {(relatedSignal || relatedOpportunity) && (
                <DrawerSection title={ui.evidence.related}>
                  <div className="flex flex-col gap-2">
                    {relatedSignal && (
                      <RelatedLink
                        href={routes.companyTab(companySlug, "signals")}
                        eyebrow={ui.evidence.relatedSignal}
                        label={relatedSignal.title}
                      />
                    )}
                    {relatedOpportunity && (
                      <RelatedLink
                        href={`${routes.companyTab(companySlug, "opportunities")}#${relatedOpportunity.id}`}
                        eyebrow={ui.evidence.relatedOpportunity}
                        label={relatedOpportunity.title}
                      />
                    )}
                  </div>
                </DrawerSection>
              )}

              <p className="text-xs text-muted-foreground">{ui.demo.notice}</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-1.5">
        {icon}
        <h4 className="eyebrow">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function RelatedLink({ href, eyebrow, label }: { href: string; eyebrow: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-md border bg-card px-3.5 py-2.5 transition-colors hover:border-foreground/25"
    >
      <div className="min-w-0">
        <div className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{eyebrow}</div>
        <div className="truncate text-sm font-medium text-foreground">{label}</div>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </Link>
  );
}
