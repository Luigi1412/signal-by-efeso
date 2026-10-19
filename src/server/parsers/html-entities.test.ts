import assert from "node:assert/strict";
import test from "node:test";
import { decodeHtmlEntities } from "./html-entities";

test("decodeHtmlEntities decodes hex numeric apostrophes used in IR HTML", () => {
  assert.equal(decodeHtmlEntities("Suzano&#x27;s adjusted EBITDA"), "Suzano's adjusted EBITDA");
  assert.equal(decodeHtmlEntities("profit&#39;s"), "profit's");
});
