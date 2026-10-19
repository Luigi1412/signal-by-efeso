import type { ReactNode } from "react";
import Link from "next/link";
import { ui } from "@/i18n";
import { relationshipStrengthLabel } from "@/lib/action-display";
import { opportunityLevelLabel } from "@/lib/opportunity-display";
import { formatDate } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { ExecutiveAccountRow } from "@/server/services/executive-dashboard-service";

const copy = ui.companies;

export function CompanyAccountCard({ account }: { account: ExecutiveAccountRow }) {
  return (
    <Link
      href={routes.company(account.companySlug)}
      aria-label={account.companyName}
      className="block rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{account.companyName}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{account.industry ?? copy.none}</p>
        </div>
        {account.demoOrigin ? (
          <span className="text-[11px] text-muted-foreground">{ui.signals.demoOrigin}</span>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        <Row label={copy.latestSignal}>
          {account.latestSignalTitle ?? copy.none}
          {account.latestSignalDate ? (
            <span className="text-muted-foreground"> · {formatDate(account.latestSignalDate)}</span>
          ) : null}
        </Row>
        <Row label={copy.topFit}>
          {account.topFitName
            ? `${account.topFitName}${account.topFitLevel ? ` · ${opportunityLevelLabel(account.topFitLevel)}` : ""}`
            : copy.none}
        </Row>
        <Row label={copy.topOpportunity}>{account.topOpportunityTitle ?? copy.none}</Row>
        <Row label={copy.relationship}>{relationshipStrengthLabel(account.relationshipStrength)}</Row>
        <Row label={copy.nextAction}>{account.nextActionTitle ?? copy.none}</Row>
      </dl>
    </Link>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 line-clamp-2 text-foreground">{children}</dd>
    </div>
  );
}
