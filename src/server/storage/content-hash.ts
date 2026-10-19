import "server-only";
import { createHash } from "node:crypto";

/**
 * SHA-256 of source capture bytes.
 *
 * Rules (Sprint 2):
 * - If an original file exists, hash the original file bytes.
 * - If no original file exists but normalized text exists, hash the UTF-8 bytes
 *   of that text (`Buffer.from(text, "utf8")`).
 * - Never trust a browser-provided hash.
 *
 * Sprint 3 also uses this for content-block and model input/output hashes.
 */
export function sha256Hex(bytes: Uint8Array | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Utf8Text(text: string): string {
  return sha256Hex(Buffer.from(text, "utf8"));
}

export function contentHashForCapture(input: {
  originalFileBytes?: Uint8Array | Buffer | null;
  normalizedText?: string | null;
}): string {
  if (input.originalFileBytes && input.originalFileBytes.byteLength > 0) {
    return sha256Hex(input.originalFileBytes);
  }
  const text = input.normalizedText?.trim();
  if (text) return sha256Utf8Text(text);
  throw new Error("SOURCE_CAPTURE_EMPTY");
}
