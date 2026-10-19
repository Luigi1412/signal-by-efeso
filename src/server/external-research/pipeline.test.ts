import assert from "node:assert/strict";
import test from "node:test";
import { detectPotentialClaimConflicts } from "./conflicts";
import { discoverCompanySources, describeSourceMix, selectAcceptedSources, selectInitialSources } from "./discover";
import { resolveCompanyEntity } from "./entity";
import { FakeExternalResearchProvider } from "./fake-provider";

test("full fake research plan: query → entity → sources → mix without network", async () => {
  const entity = resolveCompanyEntity({ query: "Suzano" });
  assert.equal(entity.kind, "resolved");
  if (entity.kind !== "resolved") return;

  const { assessed } = await discoverCompanySources({
    companyName: entity.candidate.canonicalName,
    officialDomain: entity.candidate.officialDomain,
    country: entity.candidate.headquartersCountry,
    provider: new FakeExternalResearchProvider(),
  });
  const accepted = selectAcceptedSources(assessed);
  const initial = selectInitialSources(assessed, entity.candidate.officialDomain);
  const mix = describeSourceMix(accepted);

  assert.ok(accepted.length >= 1);
  assert.ok(initial.length >= 1);
  assert.ok(initial.length <= 3);
  assert.ok(initial.every((row) => row.accepted));
  assert.equal(mix.official, true);
  assert.ok(accepted.every((row) => row.sourceQuality !== "weak"));

  const snapshots = accepted.map((row) => ({ url: row.normalizedUrl, quality: row.sourceQuality }));
  const claims = [
    { id: "c1", metricName: "capacity", numericValue: 1, periodStart: "2026-01-01", periodEnd: "2026-12-31", asOfDate: null },
    { id: "c2", metricName: "capacity", numericValue: 1, periodStart: "2026-01-01", periodEnd: "2026-12-31", asOfDate: null },
  ];
  assert.equal(detectPotentialClaimConflicts(claims).length, 0);
  assert.ok(snapshots.length >= 1);
});
