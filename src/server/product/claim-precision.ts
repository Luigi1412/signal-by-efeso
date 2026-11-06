/**
 * Numeric claims need a metric plus either a non-currency unit or a currency code.
 * Omitting `unit` while setting `currency_code` (common for revenue/EBITDA in EUR/USD)
 * must still count as precise — otherwise supported financial facts are dropped from the gate.
 */
export function isNumericClaimPrecise(input: {
  numericValue: number | null;
  metricName: string | null;
  unit: string | null;
  currencyCode: string | null;
}): boolean {
  if (input.numericValue === null) return true;
  if (!input.metricName?.trim()) return false;
  const unit = (input.unit ?? "").trim();
  if (!unit) return Boolean(input.currencyCode?.trim());
  if (/currency|moeda|dollar|real|€|\$|eur|usd|brl/i.test(unit)) {
    return Boolean(input.currencyCode?.trim());
  }
  return true;
}
