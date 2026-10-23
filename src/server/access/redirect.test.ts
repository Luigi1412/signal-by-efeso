import assert from "node:assert/strict";
import test from "node:test";
import { safeLocalRedirect } from "./redirect";
test("callback accepts local paths only",()=>{
  for(const value of ["//evil.example","/\\evil.example","/%2f%2fevil.example","/%5cevil.example","https://evil.example","/\n/evil.example"]) assert.equal(safeLocalRedirect(value),"/companies");
  assert.equal(safeLocalRedirect("/companies?a=1"),"/companies?a=1");
});
