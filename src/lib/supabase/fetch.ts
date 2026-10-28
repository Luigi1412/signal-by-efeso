/** Fail fast when local Supabase is not running instead of hanging page loads. */
export const SUPABASE_PAGE_FETCH_TIMEOUT_MS = 2500;
/** Research worker lease renewals and long pipeline RPCs need more than page-load fail-fast. */
export const SUPABASE_PIPELINE_FETCH_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.SUPABASE_PIPELINE_FETCH_TIMEOUT_MS) || 30_000,
);

function fetchWithTimeout(timeoutMs: number, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const signals = [AbortSignal.timeout(timeoutMs), init?.signal].filter((signal): signal is AbortSignal => Boolean(signal));
  return fetch(input, { ...init, signal: AbortSignal.any(signals) });
}

export function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetchWithTimeout(SUPABASE_PAGE_FETCH_TIMEOUT_MS, input, init);
}

/** Service-role pipeline client: keep AbortSignal ownership, but do not use the 2.5s page timeout. */
export function pipelineFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetchWithTimeout(SUPABASE_PIPELINE_FETCH_TIMEOUT_MS, input, init);
}
