export interface MetricClaim {
  id: string;
  metricName: string | null;
  numericValue: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  asOfDate: string | null;
}

export function detectPotentialClaimConflicts(claims: MetricClaim[]): { leftId: string; rightId: string }[] {
  const conflicts: { leftId: string; rightId: string }[] = [];
  const withMetric = claims.filter((claim) => claim.metricName && claim.numericValue != null);
  for (let i = 0; i < withMetric.length; i += 1) {
    for (let j = i + 1; j < withMetric.length; j += 1) {
      const left = withMetric[i];
      const right = withMetric[j];
      if (!left || !right) continue;
      if (left.metricName !== right.metricName) continue;
      if (!periodsOverlap(left, right)) continue;
      if (left.numericValue === right.numericValue) continue;
      conflicts.push({ leftId: left.id, rightId: right.id });
    }
  }
  return conflicts;
}

function periodsOverlap(left: MetricClaim, right: MetricClaim): boolean {
  const leftKey = left.asOfDate ?? `${left.periodStart ?? ""}:${left.periodEnd ?? ""}`;
  const rightKey = right.asOfDate ?? `${right.periodStart ?? ""}:${right.periodEnd ?? ""}`;
  if (!leftKey.replace(":", "") && !rightKey.replace(":", "")) return true;
  return leftKey === rightKey;
}
