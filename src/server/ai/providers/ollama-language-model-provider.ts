import { z } from "zod";
import {
  ModelIncompleteResponseError,
  ModelProviderUnavailableError,
} from "@/server/ai/errors";
import type {
  LanguageModelProvider,
  StructuredGenerationRequest,
  StructuredGenerationSuccess,
} from "@/server/ai/language-model-provider";

const JSON_REPAIR_ATTEMPTS = 1;
const TRANSIENT_ATTEMPTS = 2;
const BACKOFF_MS = 400;

const semaphore = {
  active: 0,
  max: 1,
  queue: [] as Array<() => void>,
};

export interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxConcurrent?: number;
}

/**
 * Local Ollama structured-generation provider.
 * Never calls OpenAI. Domain code must go through LanguageModelProvider.
 */
export class OllamaLanguageModelProvider implements LanguageModelProvider {
  readonly name = "ollama";
  private readonly baseUrl: string;
  private readonly modelOverride: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OllamaProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
    this.modelOverride = options.model?.trim() || null;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? readPositiveInt(process.env.OLLAMA_REQUEST_TIMEOUT_MS, 600_000);
    semaphore.max = options.maxConcurrent ?? readPositiveInt(process.env.OLLAMA_MAX_CONCURRENT_REQUESTS, 1);
  }

  async generateStructured<T extends z.ZodType>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationSuccess<z.infer<T>>> {
    const model = this.modelOverride || request.model?.trim();
    if (!model) {
      throw new ModelProviderUnavailableError("OLLAMA_MODEL_NOT_CONFIGURED");
    }
    await acquire();
    const started = Date.now();
    try {
      const format = jsonSchemaFromZod(request.schema);
      const schemaHint = schemaHintFromZod(request.schema);
      let lastParseError: unknown = null;
      for (let repair = 0; repair <= JSON_REPAIR_ATTEMPTS; repair += 1) {
        const response = await this.chat({
          model,
          instructions: request.instructions,
          input: request.input,
          format,
          schemaHint,
          repair: repair === 1 ? formatParseError(lastParseError) : null,
        });
        const json = extractJson(response);
        if (!json) {
          lastParseError = new ModelIncompleteResponseError("Ollama did not return JSON.");
          continue;
        }
        const withVersion = injectSchemaVersion(json, request.schemaVersion);
        const normalized = fillMissingNullables(withVersion, request.schema);
        let checked = request.schema.safeParse(normalized);
        if (!checked.success) {
          const salvaged = dropInvalidArrayItems(normalized, checked.error);
          const salvagedCheck = request.schema.safeParse(salvaged);
          if (salvagedCheck.success && !emptiedArrays(normalized, salvaged)) {
            checked = salvagedCheck;
          }
        }
        if (!checked.success) {
          lastParseError = checked.error;
          continue;
        }
        return {
          status: "completed",
          parsedOutput: checked.data,
          provider: this.name,
          requestedModel: request.model || model,
          actualModel: response.model ?? model,
          providerResponseId: null,
          inputTokens: response.inputTokens,
          cachedInputTokens: null,
          outputTokens: response.outputTokens,
          latencyMs: Date.now() - started,
          refusal: null,
          incompleteReason: null,
        };
      }
      throw lastParseError instanceof ModelIncompleteResponseError
        ? lastParseError
        : new ModelIncompleteResponseError(`Ollama output failed local Zod validation. ${formatParseError(lastParseError)}`);
    } finally {
      release();
    }
  }

  private async chat(input: {
    model: string;
    instructions: string;
    input: string;
    format: Record<string, unknown> | "json";
    schemaHint: string | null;
    repair: string | null;
  }): Promise<{ content: string; inputTokens: number | null; outputTokens: number | null; model: string | null }> {
    const user = input.repair
      ? `${input.input}\n\nPrevious output failed schema validation:\n${input.repair}\nReply with a single corrected JSON object only. No markdown, no chain-of-thought. Use numbers for numeric_value, exact enum values, and the exact schema_version literal.`
      : input.input;
    const schemaBlock = input.schemaHint
      ? `\n\nRequired JSON schema:\n${input.schemaHint}\nOmit properties whose value would be null. Keep JSON compact. Do not emit markdown.`
      : "";
    const numPredict = readPositiveInt(process.env.OLLAMA_NUM_PREDICT, 1200);
    const systemContent = `${input.instructions}${schemaBlock}\n\nReturn only a JSON object that matches the required schema. Do not include markdown fences or chain-of-thought.`;
    const numCtx = resolveNumCtx(systemContent.length + user.length, numPredict);
    const body = JSON.stringify({
      model: input.model,
      stream: false,
      format: input.format,
      keep_alive: "30m",
      options: {
        temperature: 0,
        num_ctx: numCtx,
        num_predict: numPredict,
      },
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        { role: "user", content: user },
      ],
    });

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= TRANSIENT_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body,
          signal: controller.signal,
        });
        if (response.status >= 500 || response.status === 429) {
          lastError = new ModelIncompleteResponseError(`Ollama chat failed (${response.status}).`);
          if (attempt >= TRANSIENT_ATTEMPTS) throw lastError;
          await sleep(BACKOFF_MS * attempt);
          continue;
        }
        if (!response.ok) {
          throw new ModelProviderUnavailableError(`OLLAMA_UNAVAILABLE (${response.status})`);
        }
        const payload = (await response.json()) as {
          model?: string;
          message?: { content?: string };
          prompt_eval_count?: number;
          eval_count?: number;
        };
        return {
          content: payload.message?.content ?? "",
          inputTokens: typeof payload.prompt_eval_count === "number" ? payload.prompt_eval_count : null,
          outputTokens: typeof payload.eval_count === "number" ? payload.eval_count : null,
          model: payload.model ?? null,
        };
      } catch (error) {
        if (error instanceof ModelProviderUnavailableError) throw error;
        if (isTimeout(error)) {
          throw new ModelIncompleteResponseError("Ollama request timed out.");
        }
        lastError = new ModelProviderUnavailableError("OLLAMA_UNAVAILABLE");
        if (attempt >= TRANSIENT_ATTEMPTS) throw lastError;
        await sleep(BACKOFF_MS * attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new ModelProviderUnavailableError("OLLAMA_UNAVAILABLE");
  }
}

const NATIVE_SCHEMA_MAX_CHARS = 2500;

function jsonSchemaFromZod(schema: z.ZodType): Record<string, unknown> | "json" {
  const converted = zodJsonSchema(schema);
  if (!converted) return "json";
  if (JSON.stringify(converted).length > NATIVE_SCHEMA_MAX_CHARS) return "json";
  return converted;
}

function schemaHintFromZod(schema: z.ZodType): string | null {
  const converted = zodJsonSchema(schema);
  if (!converted) return null;
  const full = JSON.stringify(converted);
  if (full.length <= NATIVE_SCHEMA_MAX_CHARS) return full;
  return compactSchemaHint(converted);
}

function compactSchemaHint(schema: Record<string, unknown>): string {
  const keys = schemaKeys(schema);
  const enums = collectEnumHints(schema);
  if (keys.includes("items") && keys.includes("schema_version")) {
    return [
      'Top-level JSON: {"schema_version":string,"items":Item[]}.',
      "Item: candidate_index integer, candidate_id string, validators object.",
      "validators keys: atomicity, grounding, geography_alignment, entity_alignment, period_alignment, numeric_consistency, unit_currency_consistency, modality_preservation, unsupported_inference.",
      "Each validator: {result:pass|warn|fail, reason:short string}. grounding also has support_level:direct|strong_indirect|weak_indirect|none.",
      "One item per candidate. Never omit result or reason. Do not return claims.",
      enums.length > 0 ? `Enums: ${enums.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (keys.includes("validators") && keys.includes("schema_version")) {
    return [
      'Top-level JSON: {"schema_version":string,"validators":{...}}.',
      "validators keys: atomicity, grounding, geography_alignment, entity_alignment, period_alignment, numeric_consistency, unit_currency_consistency, modality_preservation, unsupported_inference.",
      "Each validator: {result:pass|warn|fail, reason:short string}. grounding also has support_level:direct|strong_indirect|weak_indirect|none.",
      "Never omit result or reason.",
      enums.length > 0 ? `Enums: ${enums.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (keys.includes("signals")) {
    return [
      'Top-level JSON: {"schema_version":string,"signals":Signal[]}.',
      "Return signals:[] when the claims are only isolated financial metrics without a supported business event.",
      "Signal: candidate_key, title, summary, core_event, signal_type, signal_nature event|state, assertion_mode, claims:[{claim_id,relationship_type}].",
      "Do not invent events, commercial recommendations, or unsupported types.",
      enums.length > 0 ? `Enums: ${enums.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    'Top-level JSON: {"schema_version":string,"claims":Claim[]}.',
    'Claim: candidate_key, statement, claim_category, claim_type (always "fact"), assertion_mode,',
    "entity:{entity_id:uuid-or-null}, geography:{level,country_code ISO-2 or null,state_region,city},",
    "period:{type,start ISO-8601 date or null,end,as_of},",
    "quantitative:{metric_name,numeric_value JSON number or null,unit,currency_code ISO-3 e.g. BRL not R$,scale},",
    "citations:[{block_id,exact_quote verbatim from block text}], model_extraction_confidence integer 0-100 or null.",
    enums.length > 0 ? `Enums: ${enums.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function schemaKeys(schema: Record<string, unknown>): string[] {
  const properties = schema.properties;
  if (!properties || typeof properties !== "object") return [];
  return Object.keys(properties as Record<string, unknown>);
}

function collectEnumHints(schema: unknown, path = ""): string[] {
  if (!schema || typeof schema !== "object") return [];
  const record = schema as Record<string, unknown>;
  const out: string[] = [];
  if (Array.isArray(record.enum) && path) {
    out.push(`${path}=${record.enum.join("|")}`);
  }
  if (record.properties && typeof record.properties === "object") {
    for (const [key, value] of Object.entries(record.properties as Record<string, unknown>)) {
      out.push(...collectEnumHints(value, path ? `${path}.${key}` : key));
    }
  }
  if (record.items) out.push(...collectEnumHints(record.items, path ? `${path}[]` : "[]"));
  if (Array.isArray(record.anyOf)) {
    for (const branch of record.anyOf) out.push(...collectEnumHints(branch, path));
  }
  if (record.$defs && typeof record.$defs === "object") {
    for (const value of Object.values(record.$defs as Record<string, unknown>)) {
      out.push(...collectEnumHints(value, path));
    }
  }
  return out.slice(0, 12);
}

function zodJsonSchema(schema: z.ZodType): Record<string, unknown> | null {
  const toJson = (z as unknown as { toJSONSchema?: (value: z.ZodType) => Record<string, unknown> }).toJSONSchema;
  if (typeof toJson !== "function") return null;
  try {
    const raw = toJson(schema);
    if (!raw || typeof raw !== "object") return null;
    const copy = { ...raw };
    delete copy.$schema;
    return copy;
  } catch {
    return null;
  }
}

function emptiedArrays(before: unknown, after: unknown): boolean {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return false;
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  return Object.keys(beforeRecord).some((key) => {
    const previous = beforeRecord[key];
    const next = afterRecord[key];
    return Array.isArray(previous) && previous.length > 0 && Array.isArray(next) && next.length === 0;
  });
}

function dropInvalidArrayItems(value: unknown, error: z.ZodError): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const drops = new Map<string, Set<number>>();
  for (const issue of error.issues) {
    if (issue.path.length < 2 || typeof issue.path[0] !== "string" || typeof issue.path[1] !== "number") continue;
    const key = issue.path[0];
    const index = issue.path[1];
    const existing = drops.get(key) ?? new Set<number>();
    existing.add(index);
    drops.set(key, existing);
  }
  if (drops.size === 0) return value;
  const output: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const [key, indices] of drops) {
    const current = output[key];
    if (!Array.isArray(current)) continue;
    output[key] = current.filter((_, index) => !indices.has(index));
  }
  return output;
}

function injectSchemaVersion(value: unknown, schemaVersion: string | undefined): unknown {
  if (!schemaVersion || !value || typeof value !== "object" || Array.isArray(value)) return value;
  const output = { ...(value as Record<string, unknown>) };
  if (typeof output.schema_version !== "string" || output.schema_version.length === 0) {
    output.schema_version = schemaVersion;
  }
  if (!Array.isArray(output.items) && Array.isArray(output.claims) && !Array.isArray(output.signals)) {
    output.items = output.claims;
  }
  for (const key of ["claims", "signals", "items", "knowledge"] as const) {
    const rows = output[key];
    if (!Array.isArray(rows)) continue;
    output[key] = rows.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const row = { ...(item as Record<string, unknown>) };
      if (typeof row.candidate_key !== "string" || row.candidate_key.length === 0) {
        row.candidate_key = `${key.replace(/s$/, "")}-${index + 1}`;
      }
      if (typeof row.candidate_index !== "number") row.candidate_index = index;
      if (typeof row.candidate_id === "string" && row.candidate_id.trim().length === 0) delete row.candidate_id;
      if (typeof row.statement === "string" && row.statement.trim()) {
        if (typeof row.title !== "string" || row.title.length === 0) row.title = row.statement;
        if (typeof row.summary !== "string" || row.summary.length === 0) row.summary = row.statement;
        if (typeof row.core_event !== "string" || row.core_event.length === 0) row.core_event = row.statement;
      }
      return row;
    });
  }
  return output;
}

function fillMissingNullables(value: unknown, schema: z.ZodType): unknown {
  const jsonSchema = zodJsonSchema(schema);
  if (!jsonSchema) return value;
  return fillFromJsonSchema(value, jsonSchema, jsonSchema);
}

function fillFromJsonSchema(
  value: unknown,
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
): unknown {
  const resolved = resolveJsonSchema(schema, root);
  if (resolved.anyOf && Array.isArray(resolved.anyOf)) {
    const objectBranch = resolved.anyOf.find((branch) => {
      const item = resolveJsonSchema(branch as Record<string, unknown>, root);
      return item.type === "object" || Boolean(item.properties);
    }) as Record<string, unknown> | undefined;
    if (objectBranch) return fillFromJsonSchema(value, objectBranch, root);
  }
  if ((resolved.type === "array" || resolved.items) && Array.isArray(value) && resolved.items) {
    return value.map((item) => fillFromJsonSchema(item, resolved.items as Record<string, unknown>, root));
  }
  const isObject = resolved.type === "object" || Boolean(resolved.properties);
  if (!isObject || !value || typeof value !== "object" || Array.isArray(value)) return value;
  const properties = (resolved.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = new Set(Array.isArray(resolved.required) ? (resolved.required as string[]) : []);
  const output: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const [key, propertySchema] of Object.entries(properties)) {
    const nested = resolveJsonSchema(propertySchema, root);
    if (!(key in output)) {
      if (Object.prototype.hasOwnProperty.call(nested, "const")) {
        output[key] = nested.const;
        continue;
      }
      if (allowsNull(propertySchema, root)) {
        output[key] = null;
        continue;
      }
      if (nested.type === "object" || nested.properties) {
        output[key] = fillFromJsonSchema({}, propertySchema, root);
        continue;
      }
      if (nested.type === "array" || nested.items) {
        output[key] = [];
        continue;
      }
      if (nested.type === "string" && !allowsNull(propertySchema, root) && required.has(key)) {
        output[key] = "";
      }
      continue;
    }
    output[key] = coerceScalar(output[key], propertySchema, root, key);
    if (key === "claim_type") {
      const constValue = schemaConst(nested, root);
      if (constValue !== undefined) output[key] = constValue;
    }
    output[key] = fillFromJsonSchema(output[key], propertySchema, root);
  }
  return output;
}

function resolveJsonSchema(schema: Record<string, unknown>, root: Record<string, unknown>): Record<string, unknown> {
  const ref = schema.$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) return schema;
  let current: unknown = root;
  for (const part of ref.slice(2).split("/")) {
    if (!current || typeof current !== "object") return schema;
    current = (current as Record<string, unknown>)[part];
  }
  return current && typeof current === "object" ? (current as Record<string, unknown>) : schema;
}

function allowsNull(schema: Record<string, unknown>, root: Record<string, unknown>): boolean {
  const resolved = resolveJsonSchema(schema, root);
  if (resolved.type === "null") return true;
  if (Array.isArray(resolved.type) && resolved.type.includes("null")) return true;
  if (Array.isArray(resolved.anyOf) && resolved.anyOf.some((branch) => allowsNull(branch as Record<string, unknown>, root))) {
    return true;
  }
  return false;
}

function formatParseError(error: unknown): string {
  if (!error) return "invalid JSON";
  if (error instanceof z.ZodError) {
    return error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
  }
  if (error instanceof Error) return error.message;
  return "invalid JSON";
}

function extractJson(payload: { content: string; inputTokens: number | null; outputTokens: number | null; model: string | null }): unknown | null {
  const text = payload.content.trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const recovered = recoverTruncatedJson(candidate);
    if (recovered !== null) return recovered;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function recoverTruncatedJson(raw: string): unknown | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  const text = raw.slice(start);
  for (let cursor = text.lastIndexOf("}"); cursor >= 0; cursor = text.lastIndexOf("}", cursor - 1)) {
    const closed = closeOpenStructures(text.slice(0, cursor + 1));
    if (!closed) continue;
    try {
      return JSON.parse(closed);
    } catch {
      continue;
    }
  }
  const closed = closeOpenStructures(text);
  if (!closed) return null;
  try {
    return JSON.parse(closed);
  } catch {
    return null;
  }
}

function closeOpenStructures(text: string): string | null {
  let inString = false;
  let escape = false;
  const stack: Array<"}" | "]"> = [];
  for (const ch of text) {
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) return null;
  return text.replace(/,\s*$/, "") + stack.reverse().join("");
}

async function acquire(): Promise<void> {
  if (semaphore.active < semaphore.max) {
    semaphore.active += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    semaphore.queue.push(resolve);
  });
}

function release(): void {
  const next = semaphore.queue.shift();
  if (next) next();
  else semaphore.active = Math.max(0, semaphore.active - 1);
}

function isTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    code === "ABORT_ERR" ||
    /aborted|timeout/i.test(message)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function resolveNumCtx(promptChars: number, numPredict: number): number {
  const configured = readPositiveInt(process.env.OLLAMA_NUM_CTX, 4096);
  const needed = Math.ceil(promptChars / 2) + numPredict + 512;
  if (needed > configured || promptChars > 2500) return Math.max(configured, 8192);
  return configured;
}

function coerceScalar(
  value: unknown,
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
  key: string,
): unknown {
  const kind = schemaNumericKind(schema, root);
  if (!kind) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return value;
    return kind === "integer" ? Math.round(scaleConfidence(key, parsed)) : parsed;
  }
  if (typeof value === "number" && kind === "integer") {
    return Math.round(scaleConfidence(key, value));
  }
  return value;
}

function schemaNumericKind(schema: Record<string, unknown>, root: Record<string, unknown>): "number" | "integer" | null {
  const resolved = resolveJsonSchema(schema, root);
  if (resolved.type === "integer") return "integer";
  if (resolved.type === "number") return "number";
  if (Array.isArray(resolved.type)) {
    if (resolved.type.includes("integer")) return "integer";
    if (resolved.type.includes("number")) return "number";
  }
  if (Array.isArray(resolved.anyOf)) {
    const kinds = resolved.anyOf.map((branch) => schemaNumericKind(branch as Record<string, unknown>, root));
    if (kinds.includes("integer")) return "integer";
    if (kinds.includes("number")) return "number";
  }
  return null;
}

function schemaConst(schema: Record<string, unknown>, root: Record<string, unknown>): unknown {
  const resolved = resolveJsonSchema(schema, root);
  if (Object.prototype.hasOwnProperty.call(resolved, "const")) return resolved.const;
  if (Array.isArray(resolved.anyOf)) {
    for (const branch of resolved.anyOf) {
      const value = schemaConst(branch as Record<string, unknown>, root);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

function scaleConfidence(key: string, value: number): number {
  if (/confidence/i.test(key) && value > 0 && value <= 1) return value * 100;
  return value;
}
