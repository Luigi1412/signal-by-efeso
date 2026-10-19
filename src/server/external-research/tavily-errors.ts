export type TavilyErrorCode = "TAVILY_AUTH_FAILED" | "TAVILY_RATE_LIMITED" | "TAVILY_TIMEOUT" | "TAVILY_PROVIDER_ERROR";

export class TavilyProviderError extends Error {
  constructor(
    readonly code: TavilyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TavilyProviderError";
  }
}
