/**
 * UI language and report language are conceptually independent.
 * Both default to pt-BR in this iteration; they must not be treated as the same setting.
 */
export const UI_LOCALE = "pt-BR" as const;
export const REPORT_LOCALE = "pt-BR" as const;

export type UiLocale = "pt-BR" | "en";
export type ReportLocale = "pt-BR" | "en";
