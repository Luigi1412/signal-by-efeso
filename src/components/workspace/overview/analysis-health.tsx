import Link from "next/link";
import { SectionHeading } from "@/components/shared/section-heading";
import { ui } from "@/i18n";
import { evidenceQualityLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import type { AnalysisHealth as AnalysisHealthData } from "@/types";

interface AnalysisHealthProps {
  health: AnalysisHealthData;
  companySlug: string;
}

export function AnalysisHealth({ health, companySlug }: AnalysisHealthProps) {
  return (
    <section>
      <SectionHeading eyebrow={ui.overview.healthEyebrow} title={ui.overview.healthTitle} className="mb-4" />
      <div className="rounded-lg border bg-card">
        <dl className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <HealthItem label={ui.overview.evidenceQuality} value={evidenceQualityLabel[health.evidenceQuality]} />
          <HealthItem label={ui.overview.primaryCoverage} value={`${health.primarySourceCoverage}%`}>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/8" aria-hidden>
              <div className="h-full rounded-full bg-foreground" style={{ width: `${health.primarySourceCoverage}%` }} />
            </div>
          </HealthItem>
          <HealthItem
            label={ui.overview.conflicts}
            value={String(health.conflicts)}
            link={{ href: `${routes.companyTab(companySlug, "evidence")}?filter=conflict`, label: ui.overview.review }}
          />
          <HealthItem label={ui.overview.insufficientAreas} value={String(health.insufficientDataAreas)} />
        </dl>
        <div className="border-t px-5 py-3">
          <span className="text-xs text-muted-foreground">{ui.overview.insufficientPrefix}</span>
          <span className="text-xs text-foreground">{health.insufficientDataTopics.join(" · ")}</span>
        </div>
      </div>
    </section>
  );
}

function HealthItem({
  label,
  value,
  children,
  link,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  link?: { href: string; label: string };
}) {
  return (
    <div className="px-5 py-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="tabular text-xl font-semibold tracking-tight text-foreground">{value}</span>
        {link && (
          <Link href={link.href} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {link.label}
          </Link>
        )}
      </dd>
      {children}
    </div>
  );
}
