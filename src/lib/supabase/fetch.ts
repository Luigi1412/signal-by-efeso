/** Fail fast when local Supabase is not running instead of hanging page loads. */
const SUPABASE_FETCH_TIMEOUT_MS = 2500;

export function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const signals = [AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS), init?.signal].filter((signal): signal is AbortSignal => Boolean(signal));
  return fetch(input, { ...init, signal: AbortSignal.any(signals) });
}
