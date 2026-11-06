import { AsyncLocalStorage } from "node:async_hooks";
import { abortable } from "@/server/external-research/runtime";

interface DeadlineStore {
  signal: AbortSignal;
  deadlineAt: number;
  budgetMs: number;
}

const store = new AsyncLocalStorage<DeadlineStore>();

export function modelCallDeadlineSignal(): AbortSignal | undefined {
  return store.getStore()?.signal;
}

export function modelCallBudgetMs(): number | undefined {
  return store.getStore()?.budgetMs;
}

/**
 * Run work under a hard wall-clock deadline that ALWAYS rejects via Promise.race,
 * even if the underlying fetch/impl ignores AbortSignal.
 * Also aborts `signal` so HTTP transports that honor abort can stop early.
 */
export async function runWithModelCallDeadline<T>(
  budgetMs: number,
  work: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal,
  reason = "OLLAMA_CALL_DEADLINE",
): Promise<T> {
  // Allow sub-second budgets in tests; production callBudgetForDocument floors at 1s.
  const budget = Math.max(25, Math.floor(budgetMs));
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parent?.reason ?? new Error("RESEARCH_ABORTED"));
  if (parent) {
    if (parent.aborted) onParentAbort();
    else parent.addEventListener("abort", onParentAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(new Error(reason)), budget);
  const deadlineAt = Date.now() + budget;
  try {
    return await store.run({ signal: controller.signal, deadlineAt, budgetMs: budget }, async () => {
      const raced = work(controller.signal);
      return await abortable(raced, controller.signal);
    });
  } finally {
    clearTimeout(timer);
    if (parent) parent.removeEventListener("abort", onParentAbort);
  }
}

export function combineAbortSignals(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const active = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (active.length === 0) {
    const controller = new AbortController();
    return controller.signal;
  }
  if (active.length === 1) return active[0]!;
  return AbortSignal.any(active);
}
