"use client";

import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator";
import { KeyValue } from "@/components/shared/key-value";
import { SourceList } from "@/components/shared/source-list";
import { EvidenceTypeBadge } from "@/components/shared/status-badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { t, ui } from "@/i18n";
import { evidenceTypeLabel, formatDate, geographyLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { CompanySignal, Conflict, EvidenceClaim, EvidenceSource, Opportunity } from "@/types";
import { ConflictCard } from "./conflict-card";
import { OpenSourceFileButton } from "./open-source-file-button";

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
              {claim.origin === "persisted" && claim.persisted ? (
                <PersistedTrace claim={claim} />
              ) : (
                <>
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
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PersistedTrace({ claim }: { claim: EvidenceClaim }) {
  const trace = claim.persisted;
  if (!trace) return null;

  const location = [trace.pageNumber ? `p. ${trace.pageNumber}` : null, trace.sectionTitle]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <dl className="grid grid-cols-2 gap-4">
        <KeyValue label={ui.evidence.claimType}>
          {ui.claimKind[trace.claimType as keyof typeof ui.claimKind] ?? trace.claimType}
        </KeyValue>
        <KeyValue label={ui.evidence.verificationStatus}>
          {ui.claimVerification[trace.verificationStatus as keyof typeof ui.claimVerification] ??
            trace.verificationStatus}
        </KeyValue>
        <KeyValue label={ui.evidence.reviewStatus}>
          {ui.claimReview[trace.reviewStatus as keyof typeof ui.claimReview] ?? trace.reviewStatus}
        </KeyValue>
        <KeyValue label={ui.evidence.claimStatus}>
          {ui.claimLifecycle[trace.claimStatus as keyof typeof ui.claimLifecycle] ?? trace.claimStatus}
        </KeyValue>
        {trace.geographyDisplay && (
          <KeyValue label={ui.evidence.geography}>{trace.geographyDisplay}</KeyValue>
        )}
        {trace.periodDisplay && <KeyValue label={ui.evidence.period}>{trace.periodDisplay}</KeyValue>}
        {trace.assertionMode && (
          <KeyValue label={ui.evidence.assertionMode}>
            {ui.assertionMode[trace.assertionMode as keyof typeof ui.assertionMode] ?? trace.assertionMode}
          </KeyValue>
        )}
      </dl>

      <DrawerSection title={ui.evidence.excerpt}>
        <blockquote className="border-l-2 border-foreground/20 pl-4 text-sm leading-relaxed text-foreground">
          {trace.excerpt}
        </blockquote>
        {(trace.contextBefore || trace.contextAfter) && (
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            {trace.contextBefore && (
              <p>
                <span className="font-medium text-foreground">{ui.evidence.contextBefore}: </span>
                {trace.contextBefore}
              </p>
            )}
            {trace.contextAfter && (
              <p>
                <span className="font-medium text-foreground">{ui.evidence.contextAfter}: </span>
                {trace.contextAfter}
              </p>
            )}
          </div>
        )}
      </DrawerSection>

      <DrawerSection title={t(ui.evidence.sources, { count: claim.sourceIds.length })}>
        <div className="space-y-3 rounded-lg border bg-card px-4 py-3">
          <p className="text-sm font-medium text-foreground">{trace.sourcePublisher}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <KeyValue label={ui.evidence.sourceType}>{trace.sourceType}</KeyValue>
            <KeyValue label={ui.evidence.sourceTier}>Tier {trace.sourceTier}</KeyValue>
            <KeyValue label={ui.evidence.relationship}>
              {ui.evidenceRelationship[trace.relationship as keyof typeof ui.evidenceRelationship] ??
                trace.relationship}
            </KeyValue>
            <KeyValue label={ui.evidence.directness}>
              {ui.evidenceDirectness[trace.directness as keyof typeof ui.evidenceDirectness] ??
                trace.directness}
            </KeyValue>
            {trace.snapshotTitle && (
              <KeyValue label={ui.evidence.snapshotTitle} className="col-span-2">
                {trace.snapshotTitle}
              </KeyValue>
            )}
            {trace.publicationDate && (
              <KeyValue label={ui.evidence.publicationDate}>{formatDate(trace.publicationDate)}</KeyValue>
            )}
            <KeyValue label={ui.evidence.capturedAt}>{formatDate(trace.capturedAt)}</KeyValue>
            {location && <KeyValue label={ui.evidence.pageSection}>{location}</KeyValue>}
          </dl>
          {trace.canonicalUrl ? (
            <p className="text-sm">
              <a href={trace.canonicalUrl} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                {ui.evidence.openSource}
              </a>
            </p>
          ) : null}
          {trace.storageKey && <OpenSourceFileButton snapshotId={trace.snapshotId} />}
        </div>
      </DrawerSection>

      <p className="text-xs text-muted-foreground">{ui.evidence.persistedNotice}</p>
    </>
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
