import Link from "next/link";
import { AlertTriangle, Check, Info, Lightbulb } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { SourceList } from "@/components/shared/source-list";
import { EvidenceTypeBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOpportunityById, getSourcesByIds } from "@/data";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type {
  ReportBlock,
  ReportCalloutBlock,
  ReportKeyFindingsBlock,
  ReportListBlock,
  ReportMetricsBlock,
  ReportTableBlock,
} from "@/types";

interface ReportBlockRendererProps {
  block: ReportBlock;
  companySlug: string;
}

export function ReportBlockRenderer({ block, companySlug }: ReportBlockRendererProps) {
  switch (block.kind) {
    case "paragraph":
      return <p className="max-w-[68ch] text-[15px] leading-[1.7] text-foreground/90 print:max-w-none">{block.text}</p>;
    case "key-findings":
      return <KeyFindings block={block} companySlug={companySlug} />;
    case "metrics":
      return <Metrics block={block} />;
    case "table":
      return <ReportTable block={block} />;
    case "callout":
      return <Callout block={block} />;
    case "list":
      return <ReportList block={block} />;
    case "opportunity": {
      const opportunity = getOpportunityById(block.opportunityId);
      return opportunity ? <OpportunityCard opportunity={opportunity} companySlug={companySlug} variant="report" /> : null;
    }
    case "sources":
      return <SourceList sources={getSourcesByIds(block.sourceIds)} />;
  }
}

function KeyFindings({ block, companySlug }: { block: ReportKeyFindingsBlock; companySlug: string }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <span className="text-sm font-semibold text-foreground">{block.title ?? ui.report.keyFindings}</span>
      </div>
      <ul className="divide-y">
        {block.items.map((item) => (
          <li key={item.text} className="flex items-start justify-between gap-4 px-5 py-3">
            <span className="text-sm leading-relaxed text-foreground">
              {item.claimId ? (
                <Link href={`${routes.companyTab(companySlug, "evidence")}?claim=${item.claimId}`} className="underline-offset-4 hover:underline">
                  {item.text}
                </Link>
              ) : (
                item.text
              )}
            </span>
            <EvidenceTypeBadge type={item.type} size="sm" className="mt-0.5" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metrics({ block }: { block: ReportMetricsBlock }) {
  return (
    <div className={cn("grid gap-px overflow-hidden rounded-lg border bg-border", block.items.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
      {block.items.map((item) => (
        <div key={item.label} className="flex flex-col gap-2 bg-card px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <span className="eyebrow">{item.label}</span>
            {item.type && <EvidenceTypeBadge type={item.type} size="sm" />}
          </div>
          <span className="tabular text-2xl font-semibold tracking-tight text-foreground">{item.value}</span>
          {item.note && <span className="text-xs text-muted-foreground">{item.note}</span>}
        </div>
      ))}
    </div>
  );
}

function ReportTable({ block }: { block: ReportTableBlock }) {
  // When rowTypes is provided, the last column is a status column rendered as a badge.
  const hasStatus = Boolean(block.rowTypes);
  const dataColumns = hasStatus ? block.columns.slice(0, -1) : block.columns;
  const statusColumn = hasStatus ? block.columns[block.columns.length - 1] : null;

  return (
    <div>
      {block.title && <div className="mb-2 text-sm font-semibold text-foreground">{block.title}</div>}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {dataColumns.map((col) => (
                <TableHead key={col} className="h-9 px-4 text-xs">
                  {col}
                </TableHead>
              ))}
              {statusColumn && <TableHead className="h-9 w-28 px-4 text-xs">{statusColumn}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row, i) => (
              <TableRow key={row.join("|")} className="hover:bg-transparent">
                {row.map((cell, j) => (
                  <TableCell key={`${i}-${j}`} className={cn("px-4 py-2.5 text-sm", j === 0 ? "font-medium text-foreground" : "text-foreground/85")}>
                    {cell}
                  </TableCell>
                ))}
                {hasStatus && block.rowTypes?.[i] && (
                  <TableCell className="px-4 py-2.5">
                    <EvidenceTypeBadge type={block.rowTypes[i]} size="sm" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {block.note && <p className="mt-2 text-xs text-muted-foreground">{block.note}</p>}
    </div>
  );
}

const calloutStyles = {
  neutral: { wrapper: "border-border bg-muted/40", icon: Info, iconClass: "text-muted-foreground" },
  verified: { wrapper: "border-verified-border bg-verified-muted/60", icon: Check, iconClass: "text-verified" },
  hypothesis: { wrapper: "border-hypothesis-border bg-hypothesis-muted/60", icon: Lightbulb, iconClass: "text-hypothesis" },
  conflict: { wrapper: "border-conflict-border bg-conflict-muted/50", icon: AlertTriangle, iconClass: "text-conflict" },
} as const;

function Callout({ block }: { block: ReportCalloutBlock }) {
  const style = calloutStyles[block.tone];
  const Icon = style.icon;
  return (
    <div className={cn("flex gap-3 rounded-lg border px-5 py-4", style.wrapper)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconClass)} />
      <div>
        <div className="text-sm font-semibold text-foreground">{block.title}</div>
        <p className="mt-1 text-sm leading-relaxed text-foreground/85">{block.text}</p>
      </div>
    </div>
  );
}

function ReportList({ block }: { block: ReportListBlock }) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <div>
      {block.title && <div className="mb-2 text-sm font-semibold text-foreground">{block.title}</div>}
      <Tag className="flex flex-col gap-1.5">
        {block.items.map((item, index) => (
          <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90">
            <span className="tabular mt-px w-5 shrink-0 text-xs text-muted-foreground">
              {block.ordered ? String(index + 1).padStart(2, "0") : "—"}
            </span>
            {item}
          </li>
        ))}
      </Tag>
    </div>
  );
}
