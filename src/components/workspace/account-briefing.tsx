import Link from "next/link";
import { WhyExists } from "@/components/shared/explainability";
import { ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { opportunityLevelLabel } from "@/lib/opportunity-display";
import { relationshipStatusLabel, relationshipStrengthLabel } from "@/lib/action-display";
import type { CompanyBriefing } from "@/server/services/company-briefing-service";

const copy = ui.overview;

export function AccountBriefing({ slug, briefing }: { slug: string; briefing: CompanyBriefing }) {
  const relationship = briefing.relationship && !briefing.relationship.unavailable ? briefing.relationship : null;

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <BriefCell title={copy.whatChanged} href={routes.companyTab(slug, "signals")}>
          {briefing.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.emptyMovements}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {briefing.movements.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.title}</span>
                  {item.eventDate ? <span className="text-muted-foreground"> · {formatDate(item.eventDate)}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </BriefCell>
        <BriefCell title={copy.whatItMeans} href={routes.companyTab(slug, "intelligence")}>
          {briefing.meaningHeadline ? (
            <>
              <p className="text-sm font-medium">{briefing.meaningHeadline}</p>
              {briefing.meaningSummary ? (
                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{briefing.meaningSummary}</p>
              ) : null}
              {briefing.themes.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {copy.recurringThemes}: {briefing.themes.join(" · ")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.emptyMeaning}</p>
          )}
        </BriefCell>
        <BriefCell title={copy.efesoRelevance} href={routes.companyTab(slug, "intelligence")}>
          {briefing.topFit ? (
            <>
              <p className="text-sm font-medium">{briefing.topFit.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{opportunityLevelLabel(briefing.topFit.level)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.emptyFit}</p>
          )}
        </BriefCell>
        <BriefCell title={copy.topOpportunity} href={routes.companyTab(slug, "opportunities")}>
          {briefing.topOpportunity ? (
            <>
              <p className="text-sm font-medium">{briefing.topOpportunity.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ui.opportunities.relevance}: {opportunityLevelLabel(briefing.topOpportunity.relevanceLevel)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.emptyOpportunity}</p>
          )}
        </BriefCell>
        <BriefCell title={copy.relationshipContext} href={routes.companyTab(slug, "actions")}>
          {relationship ? (
            <>
              <p className="text-sm font-medium">
                {relationshipStatusLabel(relationship.relationshipStatus)} · {relationshipStrengthLabel(relationship.relationshipStrength)}
              </p>
              {relationship.relationshipSummary ? (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{relationship.relationshipSummary}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.emptyRelationship}</p>
          )}
        </BriefCell>
        <BriefCell title={copy.nextStep} href={routes.companyTab(slug, "actions")}>
          {briefing.nextAction ? (
            <p className="text-sm font-medium">{briefing.nextAction.title}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.emptyAction}</p>
          )}
        </BriefCell>
      </div>
      <div className="mt-6">
        <WhyExists reasons={briefing.reasons} />
      </div>
      <p className="mt-4">
        <Link href={routes.companyTab(slug, "evidence")} className="text-sm underline-offset-4 hover:underline">
          {copy.viewEvidence}
        </Link>
      </p>
    </section>
  );
}

function BriefCell({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <article className="rounded-md border px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
        <Link href={href} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          {ui.opportunities.open}
        </Link>
      </div>
      {children}
    </article>
  );
}
