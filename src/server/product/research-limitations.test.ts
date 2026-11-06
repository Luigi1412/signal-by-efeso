import assert from "node:assert/strict";
import test from "node:test";
import { buildResearchLimitations } from "./research-limitations";

test("retained primaries with zero cited primaries do not claim zero primary sources", () => {
  const items = buildResearchLimitations({
    outcome: "insufficient_evidence",
    outcomeBody: "Evidência insuficiente para promover um SIGNAL.",
    sourceCount: 6,
    primarySourceCount: 4,
    citedPrimarySourceCount: 0,
    noSupportedOpportunity: true,
    opportunityCount: 0,
    validatedFactCount: 1,
  });
  assert.equal(items.some((item) => item.id === "no-primary"), false);
  assert.equal(items.some((item) => item.id === "no-cited-primary"), true);
  assert.ok(
    items.some((item) =>
      /Fontes primárias foram retidas.*nenhum fato material validado citou origem primária/i.test(item.text),
    ),
  );
});

test("zero retained primaries keep the honest retention gap", () => {
  const items = buildResearchLimitations({
    outcome: "insufficient_evidence",
    outcomeBody: "Evidência insuficiente.",
    sourceCount: 2,
    primarySourceCount: 0,
    citedPrimarySourceCount: 0,
    noSupportedOpportunity: true,
    opportunityCount: 0,
    validatedFactCount: 0,
  });
  assert.equal(items.some((item) => item.id === "no-primary"), true);
});
