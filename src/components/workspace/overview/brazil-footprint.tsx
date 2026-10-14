import { MetricCard } from "@/components/shared/metric-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { ui } from "@/i18n";
import type { FootprintItem } from "@/types";

interface BrazilFootprintProps {
  items: FootprintItem[];
}

export function BrazilFootprint({ items }: BrazilFootprintProps) {
  return (
    <section>
      <SectionHeading
        eyebrow={ui.overview.footprintEyebrow}
        title={ui.overview.footprintTitle}
        description={ui.overview.footprintDescription}
        className="mb-4"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {items.map((item) => (
          <MetricCard
            key={item.id}
            value={item.value}
            label={item.label}
            type={item.type}
            compact
            note={item.type === "conflict" ? ui.overview.conflictNote : undefined}
          />
        ))}
      </div>
    </section>
  );
}
