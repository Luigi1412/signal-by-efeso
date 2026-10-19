import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { ModelIncompleteResponseError, ModelRefusalError } from "@/server/ai/errors";
import { FakeLanguageModelProvider } from "./fake-language-model-provider";

const schema = z.object({ ok: z.boolean() });

test("fake provider returns injected structured output", async () => {
  const provider = new FakeLanguageModelProvider([{ kind: "output", output: { ok: true } }]);
  const result = await provider.generateStructured({
    taskType: "claim_extraction",
    model: "fake",
    reasoningEffort: "low",
    promptVersion: "v1",
    schemaVersion: "v1",
    schema,
    schemaName: "t",
    instructions: "x",
    input: "y",
  });
  assert.equal(result.parsedOutput.ok, true);
  assert.equal(result.provider, "fake");
});

test("fake provider surfaces refusals and incomplete responses", async () => {
  const refusal = new FakeLanguageModelProvider([{ kind: "refusal" }]);
  await assert.rejects(
    () =>
      refusal.generateStructured({
        taskType: "claim_extraction",
        model: "fake",
        reasoningEffort: "low",
        promptVersion: "v1",
        schemaVersion: "v1",
        schema,
        schemaName: "t",
        instructions: "x",
        input: "y",
      }),
    ModelRefusalError,
  );

  const incomplete = new FakeLanguageModelProvider([{ kind: "incomplete" }]);
  await assert.rejects(
    () =>
      incomplete.generateStructured({
        taskType: "claim_semantic_validation",
        model: "fake",
        reasoningEffort: "medium",
        promptVersion: "v1",
        schemaVersion: "v1",
        schema,
        schemaName: "t",
        instructions: "x",
        input: "y",
      }),
    ModelIncompleteResponseError,
  );
});
