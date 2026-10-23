/** Preview is a separate UI namespace, never an authenticated session. */
export function isLocalPreviewRequest(environment: string | undefined, flag: string | undefined, host: string | null, forwardedHost: string | null = null, forwardedFor: string | null = null): boolean {
  if (environment !== "development" || flag !== "1" || !host) return false;
  const local = (value: string) => {
    try {
      const url = new URL(`http://${value}`);
      return !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch { return false; }
  };
  return local(host) && (!forwardedHost || local(forwardedHost)) && (!forwardedFor || forwardedFor.split(",").every(ip => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip.trim())));
}

export function localPreviewHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//") || href === "/preview" || href.startsWith("/preview/")) return href;
  return href === "/" ? "/preview/companies" : `/preview${href}`;
}
