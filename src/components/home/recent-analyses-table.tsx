"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { AnalysisStatusBadge, RelevanceBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import type { Company, RecentAnalysis } from "@/types";

interface RecentAnalysesTableProps {
  rows: { analysis: RecentAnalysis; company: Company }[];
}

export function RecentAnalysesTable({ rows }: RecentAnalysesTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 pl-5">{ui.companies.columns.company}</TableHead>
            <TableHead className="h-10">{ui.companies.columns.industry}</TableHead>
            <TableHead className="h-10">{ui.companies.columns.brazilRelevance}</TableHead>
            <TableHead className="h-10 text-right">{ui.companies.columns.opportunities}</TableHead>
            <TableHead className="h-10">{ui.companies.columns.status}</TableHead>
            <TableHead className="h-10 pr-5 text-right">{ui.companies.columns.lastUpdated}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ analysis, company }) => {
            const href =
              analysis.status === "researching"
                ? routes.analysisResearch(company.slug, {
                    analysis: analysis.persistedAnalysisId,
                    run: analysis.persistedRunId,
                  })
                : routes.company(company.slug, analysis.persistedAnalysisId);
            return (
              <TableRow
                key={analysis.persistedAnalysisId ?? `${analysis.source ?? "demo"}-${company.id}`}
                className="group cursor-pointer"
                onClick={() => router.push(href)}
              >
                <TableCell className="h-14 pl-5">
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 font-medium text-foreground outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {company.name}
                    <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                <TableCell>
                  <RelevanceBadge relevance={company.brazilRelevance} />
                </TableCell>
                <TableCell className="tabular text-right">
                  {analysis.opportunitiesCount ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <AnalysisStatusBadge status={analysis.status} />
                </TableCell>
                <TableCell className="pr-5 text-right text-muted-foreground">{analysis.lastUpdatedLabel}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
