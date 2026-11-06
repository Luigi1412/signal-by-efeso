import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("next.config scopes Tailwind turbopack loader to globals.css only", () => {
  const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
  assert.match(source, /@tailwindcss\/turbopack/);
  assert.match(source, /\*\*\/globals\.css/);
  assert.doesNotMatch(source, /"\*\.css"\s*:\s*\{[\s\S]*?@tailwindcss\/turbopack/);
  assert.doesNotMatch(source, /"\*\.module\.css"\s*:\s*\{[\s\S]*?@tailwindcss\/turbopack/);
});
