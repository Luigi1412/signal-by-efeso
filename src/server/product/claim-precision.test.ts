import assert from "node:assert/strict";
import test from "node:test";
import { isNumericClaimPrecise } from "./claim-precision";

test("currency_code without unit remains precise for monetary metrics", () => {
  assert.equal(
    isNumericClaimPrecise({
      numericValue: 7_486_000_000,
      metricName: "revenue",
      unit: null,
      currencyCode: "EUR",
    }),
    true,
  );
});

test("numeric without metric or unit/currency is not precise", () => {
  assert.equal(
    isNumericClaimPrecise({
      numericValue: 100,
      metricName: null,
      unit: null,
      currencyCode: null,
    }),
    false,
  );
  assert.equal(
    isNumericClaimPrecise({
      numericValue: 100,
      metricName: "revenue",
      unit: null,
      currencyCode: null,
    }),
    false,
  );
});

test("non-currency units do not require currency_code", () => {
  assert.equal(
    isNumericClaimPrecise({
      numericValue: 9,
      metricName: "revenue_growth",
      unit: "%",
      currencyCode: null,
    }),
    true,
  );
});
