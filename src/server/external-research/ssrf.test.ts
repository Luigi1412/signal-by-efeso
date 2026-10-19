import assert from "node:assert/strict";
import test from "node:test";
import { safeFetch, UnsafeFetchError } from "./fetch-safe";
import { assertSafeHttpUrl } from "./ssrf";

test("localhost URLs are blocked", () => {
  assert.throws(() => assertSafeHttpUrl("http://localhost/admin"), /BLOCKED_HOST/);
  assert.throws(() => assertSafeHttpUrl("http://127.0.0.1/secret"), /BLOCKED_PRIVATE_ADDRESS/);
});

test("private IP redirect is blocked", async () => {
  await assert.rejects(
    () =>
      safeFetch({
        url: "https://example.com/go",
        lookup: async (hostname) => (hostname.includes("internal") ? ["10.0.0.8"] : ["1.1.1.1"]),
        fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://internal.example/x" } }),
      }),
    (error: unknown) => error instanceof UnsafeFetchError && error.code === "BLOCKED_PRIVATE_ADDRESS",
  );
});

test("unsupported MIME is rejected", async () => {
  await assert.rejects(
    () =>
      safeFetch({
        url: "https://example.com/file.zip",
        fetchImpl: async () => new Response("zip", { status: 200, headers: { "content-type": "application/zip" } }),
      }),
    (error: unknown) => error instanceof UnsafeFetchError && error.code === "UNSUPPORTED_MIME",
  );
});

test("paywall or login page is unavailable", async () => {
  await assert.rejects(
    () =>
      safeFetch({
        url: "https://example.com/article",
        fetchImpl: async () =>
          new Response('<html><body>paywall subscribe to continue <input name="password" /></body></html>', {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      }),
    (error: unknown) => error instanceof UnsafeFetchError && error.code === "UNAVAILABLE",
  );
});

test("very large payload is limited", async () => {
  await assert.rejects(
    () =>
      safeFetch({
        url: "https://example.com/report.pdf",
        maxBytes: 64,
        fetchImpl: async () =>
          new Response(new Uint8Array(128), {
            status: 200,
            headers: { "content-type": "application/pdf", "content-length": "128" },
          }),
      }),
    (error: unknown) => error instanceof UnsafeFetchError && error.code === "TOO_LARGE",
  );
});

test("non-http protocols are blocked", () => {
  assert.throws(() => assertSafeHttpUrl("file:///etc/passwd"), /BLOCKED_PROTOCOL/);
});
