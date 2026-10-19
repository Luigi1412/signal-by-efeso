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
  const factsOnly = briefing.outcome === "facts_only" || briefing.outcome === "insufficient_evidence";
  const noSignal = briefing.outcome !== "signal_found";

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-6 rounded-md border border-border/80 bg-muted/30 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{briefing.outcomeTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{briefing.outcomeBody}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BriefCell title={copy.known}>
          {briefing.validatedFacts.length === 0 && briefing.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.emptyMovements}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {briefing.validatedFacts.slice(0, 3).map((fact) => (
                <li key={fact.id}>
                  <span className="font-medium">{fact.statement}</span>
                  {fact.period !== "—" ? (
                    <span className="text-muted-foreground"> · {fact.period}</span>
                  ) : null}
                </li>
              ))}
              {!factsOnly &&
                briefing.movements.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{item.title}</span>
                    {item.eventDate ? (
                      <span className="text-muted-foreground"> · {formatDate(item.eventDate)}</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
        </BriefCell>

        <BriefCell title={copy.whatChanged}>
          {factsOnly || briefing.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {factsOnly
                ? "Não há um movimento empresarial suficientemente sustentado para gerar um sinal."
                : copy.emptyMovements}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {briefing.movements.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.title}</span>
                  {item.eventDate ? (
                    <span className="text-muted-foreground"> · {formatDate(item.eventDate)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </BriefCell>

        <BriefCell title={copy.whatItMeans}>
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
            <p className="text-sm text-muted-foreground">
              {factsOnly ? briefing.outcomeBody : copy.emptyMeaning}
            </p>
          )}
        </BriefCell>

        <BriefCell title={copy.efesoRelevance}>
          {briefing.topFit ? (
            <>
              <p className="text-sm font-medium">{briefing.topFit.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{opportunityLevelLabel(briefing.topFit.level)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {noSignal
                ? "Sem movimento sustentado, a aderência EFESO não é inferida artificialmente."
                : copy.emptyFit}
            </p>
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
            <p className="text-sm text-muted-foreground">
              Nenhuma oportunidade está suficientemente sustentada pelas evidências disponíveis.
            </p>
          )}
        </BriefCell>

        <BriefCell title={copy.relationshipContext} href={routes.companyTab(slug, "actions")}>
          {relationship ? (
            <>
              <p className="text-sm font-medium">
                {relationshipStatusLabel(relationship.relationshipStatus)} ·{" "}
                {relationshipStrengthLabel(relationship.relationshipStrength)}
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
            <p className="text-sm text-muted-foreground">
              {noSignal ? "Nenhum próximo passo é sugerido sem evidência suficiente." : copy.emptyAction}
            </p>
          )}
        </BriefCell>

        <BriefCell title="Fontes" href={routes.companyTab(slug, "evidence")}>
          <p className="text-sm text-muted-foreground">
            {briefing.sourceCount > 0
              ? `${briefing.sourceCount} fonte(s) analisada(s). Abrir a aba Fontes para proveniência.`
              : "Ainda não há fontes persistidas para esta conta."}
          </p>
        </BriefCell>
      </div>

      {factsOnly && briefing.validatedFacts.length > 0 ? (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold">{copy.validatedFactsTitle}</h3>
          <ul className="divide-y rounded-lg border">
            {briefing.validatedFacts.map((fact) => (
              <li key={fact.id} className="px-4 py-3">
                <p className="text-sm font-medium">{fact.statement}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fact.period} · {fact.modality} · {fact.sourceLabel}
                </p>
                {fact.excerpt ? (
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground italic">&ldquo;{fact.excerpt}&rdquo;</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {briefing.reasons.length > 0 ? (
        <div className="mt-6">
          <WhyExists reasons={briefing.reasons} />
        </div>
      ) : null}

      <p className="mt-4">
        <Link href={routes.companyTab(slug, "evidence")} className="text-sm underline-offset-4 hover:underline">
          {copy.viewEvidence}
        </Link>
      </p>
    </section>
  );
}

function BriefCell({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-md border px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
        {href ? (
          <Link href={href} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            {ui.opportunities.open}
          </Link>
        ) : null}
      </div>
      {children}
    </article>
  );
}
