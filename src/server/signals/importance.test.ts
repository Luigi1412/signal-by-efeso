import assert from "node:assert/strict";
import test from "node:test";
import { deriveSignalImportance } from "./importance";

test("plant closure is high regardless of LLM suggestion", () => {
  assert.equal(
    deriveSignalImportance({
      signalType: "plant_closure",
      numericValue: null,
      unit: null,
      currencyCode: null,
      title: "Plant closure announced",
      summary: "The company announced a plant closure.",
    }),
    "high",
  );
});

test("CEO resignation is high", () => {
  assert.equal(
    deriveSignalImportance({
      signalType: "leadership_change",
      numericValue: null,
      unit: null,
      currencyCode: null,
      title: "CEO resigned",
      summary: "The CEO resigned.",
    }),
    "high",
  );
});

test("generic quality issue without magnitude is low", () => {
  assert.equal(
    deriveSignalImportance({
      signalType: "quality_issue",
      numericValue: null,
      unit: null,
      currencyCode: null,
      title: "Quality issue reported",
      summary: "A quality issue was reported.",
    }),
    "low",
  );
});
