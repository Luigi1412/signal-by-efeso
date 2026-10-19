export function normalizeCompanyQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?a\.?|sa|inc|ltd|llc|corp|corporation|group|grupo)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => {
      url.searchParams.delete(key);
    });
    let pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname) pathname = "/";
    url.pathname = pathname;
    url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    return url.toString();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function hostnameOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function registrableDomain(host: string): string {
  const parts = host.replace(/^www\./, "").toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

export function isSubdomainOrEqual(host: string, officialDomain: string): boolean {
  const left = host.replace(/^www\./, "").toLowerCase();
  const right = officialDomain.replace(/^www\./, "").toLowerCase();
  return left === right || left.endsWith(`.${right}`);
}

export function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const temp = row[j] ?? 0;
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, prev + cost);
      prev = temp;
    }
  }
  return row[right.length] ?? right.length;
}
