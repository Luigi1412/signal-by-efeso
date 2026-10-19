import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { actionQuadrantLabel, relationshipStrengthLabel } from "@/lib/action-display";
import { opportunityLevelLabel } from "@/lib/opportunity-display";
import type { AccountActionPosition } from "@/server/relationship/types";

export function RelationshipMatrix({ positions }: { positions: AccountActionPosition[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.company}</th>
            <th className="px-4 py-3 font-medium">{ui.opportunities.relevance}</th>
            <th className="px-4 py-3 font-medium">{ui.relationship.strength}</th>
            <th className="px-4 py-3 font-medium">{ui.accountsIntelligence.quadrant}</th>
            <th className="px-4 py-3 font-medium">{ui.relationship.quality}</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((row) => (
            <tr key={row.companyId} className="border-b last:border-0">
              <td className="px-4 py-3">
                <Link className="font-medium underline-offset-4 hover:underline" href={routes.companyTab(row.companySlug, "actions")}>
                  {row.companyName}
                </Link>
              </td>
              <td className="px-4 py-3">{row.opportunityRelevance ? opportunityLevelLabel(row.opportunityRelevance) : "—"}</td>
              <td className="px-4 py-3">{relationshipStrengthLabel(row.relationshipStrength)}</td>
              <td className="px-4 py-3">
                <Badge variant="outline">{actionQuadrantLabel(row.quadrant)}</Badge>
                <p className="mt-1 text-xs text-muted-foreground">{row.explanation}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.dataQuality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
