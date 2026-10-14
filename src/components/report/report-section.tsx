import type { ReportSection as ReportSectionData } from "@/types";
import { ReportBlockRenderer } from "./report-blocks";

interface ReportSectionProps {
  section: ReportSectionData;
  companySlug: string;
}

export function ReportSection({ section, companySlug }: ReportSectionProps) {
  return (
    <section id={`report-${section.id}`} aria-labelledby={`report-${section.id}-title`} className="scroll-mt-24">
      <header className="mb-5 flex items-baseline gap-4 border-b pb-3">
        <span className="tabular text-sm font-medium text-brand">{section.number}</span>
        <h2 id={`report-${section.id}-title`} className="text-xl font-semibold tracking-tight text-foreground">
          {section.title}
        </h2>
      </header>
      <div className="flex flex-col gap-5">
        {section.blocks.map((block, index) => (
          <ReportBlockRenderer key={`${section.id}-${block.kind}-${index}`} block={block} companySlug={companySlug} />
        ))}
      </div>
    </section>
  );
}
