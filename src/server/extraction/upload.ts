const PDF_MAGIC = Buffer.from("%PDF", "utf8");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const EXE_MAGIC = Buffer.from([0x4d, 0x5a]);

export type ControlledUploadKind = "text/plain" | "application/pdf";

export function detectControlledUpload(input: {
  fileName: string;
  bytes: Uint8Array;
  declaredMime?: string | null;
}): { ok: true; mimeType: ControlledUploadKind } | { ok: false; reason: string } {
  const name = input.fileName.toLowerCase().trim();
  const bytes = input.bytes instanceof Buffer ? input.bytes : Buffer.from(input.bytes);

  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(ZIP_MAGIC)) {
    return { ok: false, reason: "Archives and Office documents are not supported in Sprint 3." };
  }
  if (bytes.length >= 2 && bytes.subarray(0, 2).equals(EXE_MAGIC)) {
    return { ok: false, reason: "Executables are not supported." };
  }
  if (name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".zip") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp")) {
    return { ok: false, reason: "Unsupported file type. Use .txt or a text-native .pdf." };
  }

  const isPdfMagic = bytes.length >= 4 && bytes.subarray(0, 4).equals(PDF_MAGIC);
  if (name.endsWith(".pdf") || isPdfMagic) {
    if (!isPdfMagic) return { ok: false, reason: "File extension is .pdf but the contents are not a PDF." };
    if (!name.endsWith(".pdf")) return { ok: false, reason: "PDF files must use the .pdf extension." };
    return { ok: true, mimeType: "application/pdf" };
  }

  if (name.endsWith(".txt")) {
    if (looksBinary(bytes)) return { ok: false, reason: "The .txt file contains binary data." };
    return { ok: true, mimeType: "text/plain" };
  }

  return { ok: false, reason: "Unsupported file type. Use .txt or a text-native .pdf." };
}

function looksBinary(bytes: Buffer): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8000));
  let suspicious = 0;
  for (const value of sample) {
    if (value === 0) return true;
    if (value < 9) suspicious += 1;
  }
  return suspicious > sample.length * 0.05;
}
