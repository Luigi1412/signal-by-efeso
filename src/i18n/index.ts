import { REPORT_LOCALE, UI_LOCALE, type ReportLocale, type UiLocale } from "./config";
import { en } from "./en";
import { interpolate } from "./interpolate";
import { ptBR } from "./pt-BR";
import type { Messages } from "./types";

export { interpolate } from "./interpolate";
export { REPORT_LOCALE, UI_LOCALE } from "./config";
export type { Messages } from "./types";
export type { ReportLocale, UiLocale } from "./config";

const uiCatalogs: Record<UiLocale, Messages> = {
  "pt-BR": ptBR,
  en,
};

/** Active UI catalog. Default locale is pt-BR. */
export function getUiMessages(locale: UiLocale = UI_LOCALE): Messages {
  return uiCatalogs[locale];
}

export const ui = getUiMessages();

/** Report language is independent of the UI locale. Currently also pt-BR. */
export function getReportLocale(): ReportLocale {
  return REPORT_LOCALE;
}

export function t(template: string, vars?: Record<string, string | number>): string {
  return interpolate(template, vars);
}
