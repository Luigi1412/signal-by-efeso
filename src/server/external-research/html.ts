import { decodeHtmlEntities } from "@/server/parsers/html-entities";

export function extractHtmlText(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? decode(stripTags(titleMatch[1])).trim() : null;
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const main = withoutNoise.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? withoutNoise.replace(/<head[\s\S]*?<\/head>/i, " ");
  const text = collapse(decode(stripTags(main)));
  return { title, text };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function decode(value: string): string {
  return decodeHtmlEntities(value);
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
