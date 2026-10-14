import { EvidenceTypeBadge } from "@/components/shared/status-badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { ui } from "@/i18n";
import type { WhyNowItem } from "@/types";

interface WhyNowProps {
  items: WhyNowItem[];
}

export function WhyNow({ items }: WhyNowProps) {
  return (
    <section>
      <SectionHeading eyebrow={ui.overview.whyNowEyebrow} title={ui.overview.whyNowTitle} className="mb-4" />
      <ol className="divide-y rounded-lg border bg-card">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-start gap-4 px-5 py-4">
            <span className="tabular mt-0.5 w-6 shrink-0 text-xs font-medium text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.periodLabel}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
            <EvidenceTypeBadge type={item.type} size="sm" className="mt-0.5" />
          </li>
        ))}
      </ol>
    </section>
  );
}
