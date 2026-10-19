import assert from "node:assert/strict";
import test from "node:test";
import { computeSignalFingerprint } from "./fingerprint";

test("equivalent plant announcements share a fingerprint", () => {
  const a = computeSignalFingerprint({
    companyId: "co-1",
    signalType: "new_facility",
    coreEvent: "Company announces new plant in São Paulo",
    geography: "Brazil",
    eventDate: "2026-03-01",
    periodStart: null,
    numericValue: null,
    unit: null,
  });
  const b = computeSignalFingerprint({
    companyId: "co-1",
    signalType: "new_facility",
    coreEvent: "Company to build new facility in São Paulo",
    geography: "Brazil",
    eventDate: "2026-03-01",
    periodStart: null,
    numericValue: null,
    unit: null,
  });
  assert.equal(a, b);
});

test("different companies do not share a fingerprint", () => {
  const a = computeSignalFingerprint({
    companyId: "co-1",
    signalType: "acquisition",
    coreEvent: "acquisition of target x",
    geography: null,
    eventDate: null,
    periodStart: null,
    numericValue: null,
    unit: null,
  });
  const b = computeSignalFingerprint({
    companyId: "co-2",
    signalType: "acquisition",
    coreEvent: "acquisition of target x",
    geography: null,
    eventDate: null,
    periodStart: null,
    numericValue: null,
    unit: null,
  });
  assert.notEqual(a, b);
});
