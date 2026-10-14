/** Fail fast when local Supabase is not running instead of hanging page loads. */
const SUPABASE_FETCH_TIMEOUT_MS = 2500;

export function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS) });
}
