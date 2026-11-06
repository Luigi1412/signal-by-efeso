import assert from "node:assert/strict";
import test from "node:test";
import { runWithModelCallDeadline } from "@/server/ai/model-call-deadline";
import { decideCandidateStatus } from "./promotion-policy";
import type { ValidationRecord } from "./validation-types";

test("late work after deadline does not return a persistable success", async () => {
  const result = await Promise.race([
    runWithModelCallDeadline(40, async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { supported: true };
    }).then(
      (value) => ({ kind: "resolved" as const, value }),
      (error) => ({ kind: "rejected" as const, error }),
    ),
    new Promise<{ kind: "hang" }>((resolve) => setTimeout(() => resolve({ kind: "hang" }), 500)),
  ]);
  assert.equal(result.kind, "rejected");
  if (result.kind === "rejected") {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    assert.match(message, /OLLAMA_CALL_DEADLINE|abort/i);
  }
});

test("pending never becomes active without a passing direct grounding validation", () => {
  const onlyDeterministic: ValidationRecord[] = [
    {
      validatorCode: "citation_exists",
      validatorVersion: "v1",
      validatorType: "deterministic",
      result: "pass",
      severity: "info",
      message: "ok",
      details: {},
    },
  ];
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: onlyDeterministic,
  });
  assert.notEqual(decision.status, "validated");
  assert.notEqual(decision.status, "promoted");
});
