function wrap(objects: string[]): Uint8Array {
  const header = "%PDF-1.4\n";
  const pieces: string[] = [header];
  const offsets: number[] = [0];
  let cursor = Buffer.byteLength(header);

  objects.forEach((object, index) => {
    offsets[index + 1] = cursor;
    const body = `${index + 1} 0 obj\n${object}\nendobj\n`;
    pieces.push(body);
    cursor += Buffer.byteLength(body);
  });

  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  pieces.push(xref, trailer);
  return Buffer.from(pieces.join(""), "utf8");
}

function wrapLine(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildTextPdf(text: string): Uint8Array {
  const ascii = text.replace(/[^\x20-\x7E]/g, " ");
  const lines = wrapLine(ascii, 70);
  const ops = lines
    .map((line, index) => {
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      return index === 0
        ? `BT /F1 11 Tf 72 720 Td (${escaped}) Tj`
        : `0 -16 Td (${escaped}) Tj`;
    })
    .join("\n");
  const stream = `${ops}\nET`;
  return wrap([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]);
}

export function buildEmptyPagePdf(): Uint8Array {
  return wrap([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
  ]);
}
