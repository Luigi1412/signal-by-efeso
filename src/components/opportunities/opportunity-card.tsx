"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleHelp } from "lucide-react";
import { KeyValue } from "@/components/shared/key-value";
import { EvidenceTypeBadge, StatusBadge, StrengthBadge } from "@/components/shared/status-badge";
import { getCapabilitiesByIds } from "@/data";
import { ui } from "@/i18n";
import {
  clientValidationLabel,
  efesoFitLabel,
  evidenceStrengthLabel,
  opportunityStrengthBand,
  opportunityStrengthLabel,
} from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/types";
import { OpportunityActions } from "./opportunity-actions";

interface OpportunityCardProps {
  opportunity: Opportunity;
  companySlug: string;
  /** Rendered inside the report: no actions, lighter chrome. */
  variant?: "workspace" | "report";
}

export function OpportunityCard({ opportunity, companySlug, variant = "workspace" }: OpportunityCardProps) {
  const capabilities = getCapabilitiesByIds(opportunity.capabilityIds);
  const isLow = opportunityStrengthBand(opportunity.score) === "fraca";
  const evidenceHref = (claimId?: string) =>
    claimId ? `${routes.companyTab(companySlug, "evidence")}?claim=${claimId}` : routes.companyTab(companySlug, "evidence");

  return (
    <article id={opportunity.id} className={cn("scroll-mt-24 rounded-lg border bg-card", isLow && "border-dashed")}>
      <header className="flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <div className="flex items-center gap-2">
            <StrengthBadge score={opportunity.score} />
            {opportunity.evidenceStrength === "Insufficient" && (
              <StatusBadge tone="hypothesis" dot={false}>
                {ui.opportunities.insufficient}
              </StatusBadge>
            )}
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">{opportunity.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{opportunity.summary}</p>
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:grid-cols-2 lg:gap-x-10">
          <KeyValue label={ui.opportunityStrength.label}>
            <span className="flex items-baseline gap-1.5">
              <span className="font-semibold">{opportunityStrengthLabel(opportunity.score)}</span>
              <span className="tabular text-muted-foreground">{opportunity.score}</span>
            </span>
          </KeyValue>
          <KeyValue label={ui.opportunities.efesoFit}>
            <span className="font-medium">{efesoFitLabel[opportunity.efesoFit]}</span>
          </KeyValue>
          <KeyValue label={ui.opportunities.evidenceStrength}>
            <span className={cn("font-medium", opportunity.evidenceStrength === "Insufficient" && "text-hypothesis")}>
              {evidenceStrengthLabel[opportunity.evidenceStrength]}
            </span>
          </KeyValue>
          <KeyValue label={ui.opportunities.clientValidation}>
            <span className="font-medium">{clientValidationLabel[opportunity.clientValidation]}</span>
          </KeyValue>
        </dl>
      </header>

      <div className="grid divide-y border-t lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <Section eyebrow={ui.opportunities.knownEyebrow} title={ui.opportunities.knownTitle}>
          <ul className="flex flex-col gap-2">
            {opportunity.whySignalIdentified.map((point) => (
              <li key={point.text} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-3.5 shrink-0 text-verified" strokeWidth={2.5} />
                {variant === "workspace" && point.claimId ? (
                  <Link href={evidenceHref(point.claimId)} className="text-foreground underline-offset-4 hover:underline">
                    {point.text}
                  </Link>
                ) : (
                  <span className="text-foreground">{point.text}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section
          eyebrow={ui.opportunities.happeningEyebrow}
          title={ui.opportunities.happeningTitle}
          badge={<EvidenceTypeBadge type="hypothesis" size="sm" />}
        >
          <p className="rounded-md border border-hypothesis-border bg-hypothesis-muted/60 px-4 py-3 text-sm leading-relaxed text-foreground">
            {opportunity.hypothesis}
          </p>
        </Section>

        <Section eyebrow={ui.opportunities.capabilitiesEyebrow} title={ui.opportunities.capabilitiesTitle}>
          <ul className="flex flex-wrap gap-2">
            {capabilities.map((cap) => (
              <li key={cap.id} className="rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground" title={cap.description}>
                {cap.name}
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow={ui.opportunities.unknownEyebrow} title={ui.opportunities.unknownTitle}>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {opportunity.unknowns.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                <CircleHelp className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {opportunity.discoveryQuestions.length > 0 && (
        <section className="border-t px-6 py-5 sm:px-7">
          <div className="eyebrow mb-2">{ui.opportunities.discoveryTitle}</div>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {opportunity.discoveryQuestions.map((question, index) => (
              <li key={question} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="tabular mt-px w-5 shrink-0 text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {question}
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="flex flex-col gap-4 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{ui.opportunities.recommendedPrefix}</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            {opportunity.recommendedNextStep}
            <ArrowRight className="size-3.5 text-muted-foreground" />
          </span>
        </div>
        {variant === "workspace" && <OpportunityActions opportunityTitle={opportunity.title} companySlug={companySlug} />}
      </footer>
    </article>
  );
}

function Section({
  eyebrow,
  title,
  badge,
  children,
}: {
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="p-6 sm:p-7">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h4 className="mt-1 text-sm font-semibold text-foreground">{title}</h4>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}
