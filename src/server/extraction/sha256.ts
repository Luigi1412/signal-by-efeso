import { createHash } from "node:crypto";

export function sha256Hex(bytes: Uint8Array | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Utf8Text(text: string): string {
  return sha256Hex(Buffer.from(text, "utf8"));
}

export function sha256Json(value: unknown): string {
  return sha256Utf8Text(JSON.stringify(value));
}
