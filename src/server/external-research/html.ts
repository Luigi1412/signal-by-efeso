import { decodeHtmlEntities } from "@/server/parsers/html-entities";
import { isSubdomainOrEqual } from "./normalize";

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

/** Extract same-domain PDF hrefs for official IR / press shells that render little text. */
export function extractOfficialPdfLinks(html: string, pageUrl: string, officialDomain: string | null, limit = 3): string[] {
  if (!officialDomain) return [];
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const found: string[] = [];
  const seen = new Set<string>();
  const hrefRe = /href\s*=\s*["']([^"']+\.pdf[^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html)) !== null && found.length < limit) {
    const raw = match[1];
    if (!raw) continue;
    try {
      const absolute = new URL(raw, base).toString();
      const host = new URL(absolute).hostname.replace(/^www\./, "").toLowerCase();
      if (!isSubdomainOrEqual(host, officialDomain)) continue;
      const key = absolute.split("#")[0] ?? absolute;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(key);
    } catch {
      continue;
    }
  }
  return found;
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
