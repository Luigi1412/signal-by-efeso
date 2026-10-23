import { AsyncLocalStorage } from "node:async_hooks";

export interface ResearchRuntime {
  runId: string;
  owner: string;
  signal: AbortSignal;
  assertOwned: () => Promise<void>;
  counters: Record<string, number>;
  memo: Map<string, unknown>;
}

export const researchRuntime = new AsyncLocalStorage<ResearchRuntime>();
export function researchSignal(): AbortSignal | undefined { return researchRuntime.getStore()?.signal; }
export function countResearch(name: string, amount = 1): void {
  const counters = researchRuntime.getStore()?.counters;
  if (counters) counters[name] = (counters[name] ?? 0) + amount;
}
export async function assertResearchOwned(): Promise<void> {
  const runtime = researchRuntime.getStore();
  runtime?.signal.throwIfAborted();
  if (runtime) await runtime.assertOwned();
}

/** Also bounds operations whose implementation ignores AbortSignal (e.g. test doubles). */
export async function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  signal.throwIfAborted();
  let listener: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    listener = () => reject(signal.reason ?? new Error("RESEARCH_ABORTED"));
    signal.addEventListener("abort", listener, { once: true });
  });
  try { return await Promise.race([work, aborted]); }
  finally { signal.removeEventListener("abort", listener); }
}

export async function mapBounded<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, async () => {
    while (next < items.length) {
      researchSignal()?.throwIfAborted();
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  }));
  return results;
}
