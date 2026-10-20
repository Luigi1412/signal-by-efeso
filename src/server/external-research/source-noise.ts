import { registrableDomain } from "./normalize";

const SOCIAL_HOSTS = new Set([
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "facebook.com",
  "fb.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linkedin.com",
  "pinterest.com",
  "threads.net",
  "reddit.com",
]);

const ECOMMERCE_PATH =
  /\/(?:produto|product|products|produtos|categoria|category|categories|loja|shop|store|cart|checkout|sku|dp|p)(?:\/|$)|add[-_]?to[-_]?cart|wishlist|frete|cep=/i;

export function isSocialHost(host: string): boolean {
  const root = registrableDomain(host);
  return SOCIAL_HOSTS.has(root) || SOCIAL_HOSTS.has(host);
}

export function isEcommercePath(value: string): boolean {
  return ECOMMERCE_PATH.test(value);
}

export function isRejectedNoiseUrl(url: string): boolean {
  const host = safeHost(url);
  const path = safePath(url);
  return isSocialHost(host) || isEcommercePath(path) || isEcommercePath(url);
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
}
