import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { ModelIncompleteResponseError, ModelProviderUnavailableError } from "@/server/ai/errors";
import { claimExtractionOutputSchema } from "@/server/ai/schemas/claim-extraction-schema";
import { claimValidationBatchOutputSchema } from "@/server/ai/schemas/claim-validation-schema";
import { CLAIM_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import { OllamaLanguageModelProvider } from "./ollama-language-model-provider";

const schema = z.object({ ok: z.boolean(), label: z.string() });

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function request() {
  return {
    taskType: "claim_extraction" as const,
    model: "llama3.1:8b",
    reasoningEffort: "low" as const,
    promptVersion: "v1",
    schemaVersion: "v1",
    schema,
    schemaName: "t",
    instructions: "Return JSON",
    input: "ping",
  };
}

test("Ollama provider parses structured JSON and revalidates with Zod", async () => {
  const urls: string[] = [];
  const provider = new OllamaLanguageModelProvider({
    baseUrl: "http://127.0.0.1:11434",
    fetchImpl: async (url) => {
      urls.push(String(url));
      return jsonResponse(200, {
        model: "llama3.1:8b",
        message: { content: '{"ok":true,"label":"local"}' },
        prompt_eval_count: 11,
        eval_count: 7,
      });
    },
  });
  const result = await provider.generateStructured(request());
  assert.equal(result.provider, "ollama");
  assert.equal(result.parsedOutput.ok, true);
  assert.equal(result.providerResponseId, null);
  assert.equal(result.inputTokens, 11);
  assert.equal(result.outputTokens, 7);
  assert.ok(urls.every((url) => url.startsWith("http://127.0.0.1:11434/")));
  assert.ok(urls.every((url) => !url.includes("openai")));
});

test("Ollama provider rejects invalid JSON after one repair", async () => {
  let calls = 0;
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(200, { message: { content: "not-json" } });
    },
  });
  await assert.rejects(
    () => provider.generateStructured(request()),
    (error: unknown) => error instanceof ModelIncompleteResponseError,
  );
  assert.equal(calls, 2);
});

test("Ollama provider recovers truncated JSON objects", async () => {
  const list = z.object({
    ok: z.boolean(),
    items: z.array(z.object({ label: z.string() })),
  });
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () =>
      jsonResponse(200, { message: { content: '{"ok":true,"items":[{"label":"kept"},{"label":"cut' } }),
  });
  const result = await provider.generateStructured({
    ...request(),
    schema: list,
  });
  assert.equal(result.parsedOutput.ok, true);
  assert.deepEqual(result.parsedOutput.items, [{ label: "kept" }]);
});

test("Ollama provider fills omitted required nested objects with nullable defaults", async () => {
  const nested = z.object({
    ok: z.boolean(),
    quantitative: z.object({
      metric_name: z.string().nullable(),
      numeric_value: z.number().nullable(),
    }),
  });
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () => jsonResponse(200, { message: { content: '{"ok":true}' } }),
  });
  const result = await provider.generateStructured({
    ...request(),
    schema: nested,
  });
  assert.equal(result.parsedOutput.ok, true);
  assert.equal(result.parsedOutput.quantitative.metric_name, null);
  assert.equal(result.parsedOutput.quantitative.numeric_value, null);
});

test("Ollama provider coerces numeric strings, confidence fractions, and claim_type literals", async () => {
  const extraction = z.object({
    schema_version: z.literal("claim-extraction-schema-v1"),
    claims: z.array(
      z.object({
        candidate_key: z.string(),
        statement: z.string(),
        claim_type: z.literal("fact"),
        quantitative: z.object({
          numeric_value: z.number().nullable(),
        }),
        model_extraction_confidence: z.number().int().min(0).max(100).nullable(),
      }),
    ),
  });
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () =>
      jsonResponse(200, {
        message: {
          content: JSON.stringify({
            claims: [
              {
                statement: "Revenue reached 13.3",
                claim_type: "reported_figure",
                quantitative: { numeric_value: "13,3" },
                model_extraction_confidence: 0.8,
              },
            ],
          }),
        },
      }),
  });
  const result = await provider.generateStructured({
    ...request(),
    schema: extraction,
    schemaVersion: "claim-extraction-schema-v1",
  });
  assert.equal(result.parsedOutput.claims[0]?.claim_type, "fact");
  assert.equal(result.parsedOutput.claims[0]?.quantitative.numeric_value, 13.3);
  assert.equal(result.parsedOutput.claims[0]?.model_extraction_confidence, 80);
});

test("Ollama provider uses a compact schema hint when the JSON schema is large", async () => {
  let captured: { format?: unknown; system?: string; num_ctx?: number } = {};
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}")) as {
        format?: unknown;
        options?: { num_ctx?: number };
        messages?: Array<{ content?: string }>;
      };
      captured = {
        format: body.format,
        system: body.messages?.[0]?.content,
        num_ctx: body.options?.num_ctx,
      };
      return jsonResponse(200, {
        message: { content: '{"schema_version":"claim-extraction-schema-v1","claims":[]}' },
      });
    },
  });
  await provider.generateStructured({
    ...request(),
    schema: claimExtractionOutputSchema,
    schemaVersion: "claim-extraction-schema-v1",
  });
  assert.equal(captured.format, "json");
  assert.ok((captured.system ?? "").includes("currency_code ISO-3"));
  assert.ok((captured.system ?? "").length < 20_000);
  assert.ok((captured.num_ctx ?? 0) >= 4096);
});

test("Ollama provider uses a validation-batch compact hint instead of the extraction hint", async () => {
  let captured = "";
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}")) as {
        messages?: Array<{ content?: string }>;
      };
      captured = body.messages?.[0]?.content ?? "";
      return jsonResponse(200, {
        message: {
          content: JSON.stringify({
            schema_version: CLAIM_VALIDATION_SCHEMA_VERSION,
            items: [
              {
                candidate_index: 0,
                validators: {
                  atomicity: { result: "pass", reason: "one fact" },
                  grounding: { result: "pass", support_level: "direct", reason: "quote" },
                  geography_alignment: { result: "pass", reason: "br" },
                  entity_alignment: { result: "pass", reason: "suzano" },
                  period_alignment: { result: "pass", reason: "q2" },
                  numeric_consistency: { result: "pass", reason: "13.3" },
                  unit_currency_consistency: { result: "pass", reason: "brl" },
                  modality_preservation: { result: "pass", reason: "stated" },
                  unsupported_inference: { result: "pass", reason: "none" },
                },
              },
            ],
          }),
        },
      });
    },
  });
  await provider.generateStructured({
    ...request(),
    schema: claimValidationBatchOutputSchema,
    schemaVersion: CLAIM_VALIDATION_SCHEMA_VERSION,
  });
  assert.ok(captured.includes('"items":Item[]'));
  assert.ok(!captured.includes('"claims":Claim[]'));
});

test("Ollama provider maps claims to items and fills signal candidate keys", async () => {
  const batch = z.object({
    schema_version: z.literal("v1"),
    items: z.array(
      z.object({
        candidate_index: z.number(),
        validators: z.object({ grounding: z.object({ result: z.enum(["pass"]) }) }),
      }),
    ),
  });
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () =>
      jsonResponse(200, {
        message: {
          content: JSON.stringify({
            claims: [{ candidate_index: 0, validators: { grounding: { result: "pass" } } }],
          }),
        },
      }),
  });
  const result = await provider.generateStructured({
    ...request(),
    schema: batch,
    schemaVersion: "v1",
  });
  assert.equal(result.parsedOutput.items[0]?.candidate_index, 0);
});

test("Ollama provider fills omitted schema_version and candidate_key then revalidates", async () => {
  const extraction = z.object({
    schema_version: z.literal("claim-extraction-schema-v1"),
    claims: z.array(
      z.object({
        candidate_key: z.string(),
        statement: z.string(),
      }),
    ),
  });
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () => jsonResponse(200, { message: { content: '{"claims":[{"statement":"Suzano announced capex in Brazil."}]}' } }),
  });
  const result = await provider.generateStructured({
    ...request(),
    schema: extraction,
    schemaVersion: "claim-extraction-schema-v1",
  });
  assert.equal(result.parsedOutput.schema_version, "claim-extraction-schema-v1");
  assert.equal(result.parsedOutput.claims[0]?.candidate_key, "claim-1");
  assert.equal(result.parsedOutput.claims[0]?.statement, "Suzano announced capex in Brazil.");
});

test("Ollama provider fills omitted nullable keys then revalidates with Zod", async () => {
  const nested = z.object({
    ok: z.boolean(),
    note: z.string().nullable(),
  });
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () => jsonResponse(200, { message: { content: '{"ok":true}' } }),
  });
  const result = await provider.generateStructured({
    ...request(),
    schema: nested,
  });
  assert.equal(result.parsedOutput.ok, true);
  assert.equal(result.parsedOutput.note, null);
});

test("Ollama provider drops invalid array items then accepts remaining valid objects", async () => {
  const item = z.object({ label: z.enum(["a", "b"]) });
  const list = z.object({ items: z.array(item) });
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () => jsonResponse(200, { message: { content: '{"items":[{"label":"a"},{"label":"nope"}]}' } }),
  });
  const result = await provider.generateStructured({
    ...request(),
    schema: list,
  });
  assert.deepEqual(result.parsedOutput.items, [{ label: "a" }]);
});

test("Ollama provider rejects Zod-invalid objects", async () => {
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async () => jsonResponse(200, { message: { content: '{"ok":"nope"}' } }),
  });
  await assert.rejects(() => provider.generateStructured(request()), ModelIncompleteResponseError);
});

test("Ollama provider does not silently call OpenAI when unavailable", async () => {
  const urls: string[] = [];
  const provider = new OllamaLanguageModelProvider({
    fetchImpl: async (url) => {
      urls.push(String(url));
      throw Object.assign(new Error("connect"), { name: "TypeError" });
    },
  });
  await assert.rejects(
    () => provider.generateStructured(request()),
    (error: unknown) => error instanceof ModelProviderUnavailableError && String(error.message).includes("OLLAMA"),
  );
  assert.ok(urls.every((url) => url.includes("127.0.0.1:11434")));
  assert.ok(!urls.some((url) => url.includes("api.openai.com")));
});
