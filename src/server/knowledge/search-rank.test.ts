import assert from "node:assert/strict";
import test from "node:test";
import { matchRelevantKnowledge, rankKnowledgeSearch, type KnowledgeSearchRecord } from "./search-rank";

const asset: KnowledgeSearchRecord = {
  id: "1",
  canonicalName: "Asset Productivity",
  normalizedName: "asset productivity",
  objectType: "capability",
  shortDescription: "Improve maintenance and asset performance.",
  status: "active",
  aliases: ["AP"],
  tags: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
    { category: "BUSINESS_PROBLEM", canonicalName: "maintenance" },
    { category: "INDUSTRY", canonicalName: "Automotive" },
  ],
};

const draftBoost: KnowledgeSearchRecord = {
  id: "2",
  canonicalName: "BOOST",
  normalizedName: "boost",
  objectType: "methodology",
  shortDescription: "EFESO methodology.",
  status: "needs_review",
  aliases: ["BOOST methodology"],
  tags: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Transformation" }],
};

test("production search excludes needs_review objects by default", () => {
  const hits = rankKnowledgeSearch([asset, draftBoost], { query: "BOOST" });
  assert.equal(hits.length, 0);
});

test("needs_review remains inspectable when status is requested", () => {
  const hits = rankKnowledgeSearch([asset, draftBoost], { query: "BOOST", status: "needs_review" });
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.record.canonicalName, "BOOST");
});

test("ranking prefers exact canonical, then alias, then tag, then text", () => {
  const aliasOnly: KnowledgeSearchRecord = {
    ...asset,
    id: "3",
    canonicalName: "Maintenance Excellence",
    aliases: ["Asset Productivity"],
  };
  const exact = rankKnowledgeSearch([asset, aliasOnly], { query: "Asset Productivity" });
  assert.equal(exact[0]?.rank, 1);
  assert.equal(exact[0]?.record.id, "1");
});

test("relevant knowledge returns deterministic match reasons without pitch language", () => {
  const hits = matchRelevantKnowledge([asset, draftBoost], {
    industries: ["Automotive"],
    themes: ["Asset Productivity"],
    businessProblems: ["maintenance"],
    signalKeywords: ["maintenance"],
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.record.canonicalName, "Asset Productivity");
  assert.ok(hits[0]?.matchedBecause.includes("capability_domain:Asset Productivity"));
  assert.ok(hits[0]?.matchedBecause.includes("business_problem:maintenance"));
  assert.equal(
    hits[0]?.matchedBecause.some((reason) => /pitch|should|recommend/i.test(reason)),
    false,
  );
});
