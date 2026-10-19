import assert from "node:assert/strict";
import test from "node:test";
import {
  containsForbiddenMemberLeak,
  isMemberVisibleKnowledge,
  sanitizeMemberExplanation,
  sanitizeMemberText,
  validateNatureOutcome,
} from "./governance";
import { checkEfesoKnowledgeSources, normalizeSourceFilename } from "./efeso-knowledge-sources";
import { buildCanonicalKnowledgePack, buildEfesoKnowledgePack, buildSourceManifest } from "./pack-builder";
import { validateKnowledgePack } from "./pack-schema";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("proposed scope is never a delivered result", () => {
  const check = validateNatureOutcome("proposed_scope", "delivered");
  assert.equal(check.ok, false);
});

test("expected benefit is never delivered", () => {
  const check = validateNatureOutcome("expected_benefit", "delivered");
  assert.equal(check.ok, false);
});

test("historical benchmark is not delivered", () => {
  const check = validateNatureOutcome("historical_benchmark", "delivered");
  assert.equal(check.ok, false);
});

test("member cannot see restricted or commercial objects", () => {
  assert.equal(
    isMemberVisibleKnowledge({
      visibilityLevel: "restricted_account_team",
      confidentialityLevel: "internal",
      approvedForDisplay: true,
      commercialTermsPresent: false,
      knowledgeNature: "reusable_methodology",
    }),
    false,
  );
  assert.equal(
    isMemberVisibleKnowledge({
      visibilityLevel: "admin_only",
      confidentialityLevel: "internal",
      approvedForDisplay: true,
      commercialTermsPresent: false,
      knowledgeNature: "institutional_fact",
    }),
    false,
  );
  assert.equal(
    isMemberVisibleKnowledge({
      visibilityLevel: "efeso_member",
      confidentialityLevel: "internal",
      approvedForDisplay: true,
      commercialTermsPresent: true,
      knowledgeNature: "institutional_fact",
    }),
    false,
  );
});

test("proposal contact and price are stripped from member text", () => {
  const leaked = "Contact jane.doe@client.com. Investment R$ 1.200.000. Phone +55 11 99999-0000.";
  assert.equal(containsForbiddenMemberLeak(leaked), true);
  const clean = sanitizeMemberText(leaked);
  assert.equal(/jane\.doe@client\.com/i.test(clean), false);
  assert.equal(/R\$/.test(clean), false);
});

test("restricted matching explanation is sanitized", () => {
  const explanation = sanitizeMemberExplanation({
    explanation: "See proposal 126-2026 for Coamo spare-parts scope.",
    visibilityLevel: "restricted_account_team",
    confidentialityLevel: "highly_confidential",
  });
  assert.equal(/Coamo/i.test(explanation), false);
  assert.equal(/126-2026/.test(explanation), false);
});

test("filename matching accepts unicode dash and accent variants", () => {
  const expected = "Proposta 069-2022 – Neodent_Excelência no Planejamento de Materiais.pptx";
  const variant = "Proposta 069-2022 - Neodent_Excelencia no Planejamento de Materiais.pptx";
  assert.equal(normalizeSourceFilename(expected), normalizeSourceFilename(variant));
});

test("canonical pack has no prices, contacts, or proposal-as-case objects", () => {
  const pack = buildCanonicalKnowledgePack();
  const manifest = buildSourceManifest();
  const issues = validateKnowledgePack(pack, new Set(manifest.sources.map((row) => row.source_id)));
  assert.equal(issues.length, 0);
  assert.ok(pack.objects.some((row) => row.object_type === "capability" && row.canonical_name === "Operational Excellence"));
  assert.ok(pack.objects.some((row) => row.object_type === "methodology" && row.canonical_name === "WCOM"));
  assert.equal(pack.objects.some((row) => row.object_type === "case"), false);
  assert.equal(pack.objects.some((row) => row.knowledge_nature === "delivered_result"), false);
  assert.equal(pack.objects.some((row) => row.knowledge_nature === "proposed_scope"), false);
  for (const object of pack.objects) {
    assert.equal(containsForbiddenMemberLeak(`${object.description} ${object.aliases.join(" ")}`), false);
  }
});

test("sourced pack keeps proposals off completed cases and PrimeTwin off delivered results", () => {
  const pack = buildEfesoKnowledgePack();
  const manifest = buildSourceManifest();
  const issues = validateKnowledgePack(pack, new Set(manifest.sources.map((row) => row.source_id)));
  assert.equal(issues.length, 0);
  assert.ok(pack.objects.some((row) => row.stable_key === "result.sif-processing-time"));
  assert.ok(pack.objects.some((row) => row.stable_key === "result.latam-pke-process-industry"));
  assert.ok(pack.objects.some((row) => row.stable_key === "result.latam-bioenergy-opex"));
  assert.ok(pack.objects.some((row) => row.stable_key === "result.latam-home-care-wcom"));
  assert.equal(pack.objects.some((row) => row.object_type === "case" && row.knowledge_nature === "proposed_scope"), false);
  assert.equal(
    pack.objects.some((row) => row.source_references.some((ref) => ref.source_id.startsWith("src-proposta") || ref.source_id.includes("br011") || ref.source_id.includes("br0030")) && row.object_type === "case"),
    false,
  );
  const primeTwin = pack.objects.find((row) => row.stable_key === "benchmark.primetwin-country-reports");
  assert.ok(primeTwin);
  assert.equal(primeTwin?.knowledge_nature, "historical_benchmark");
  assert.equal(primeTwin?.outcome_status, "benchmark");
  assert.equal(primeTwin?.approved_for_display, false);
  const namedClients = /Luxottica|Eurofarma|Koppert|Boehringer|Coamo|Tirreno|Sun Chemical|Neodent|Cargill/i;
  for (const object of pack.objects) {
    assert.equal(containsForbiddenMemberLeak(`${object.canonical_name} ${object.description} ${object.aliases.join(" ")}`), false);
    const memberVisible = isMemberVisibleKnowledge({
      visibilityLevel: object.visibility_level,
      confidentialityLevel: object.confidentiality_level,
      approvedForDisplay: object.approved_for_display,
      commercialTermsPresent: false,
      knowledgeNature: object.knowledge_nature,
    });
    if (object.stable_key.startsWith("restricted.")) {
      assert.equal(memberVisible, false);
    }
    if (memberVisible) {
      assert.equal(namedClients.test(`${object.canonical_name} ${object.description}`), false);
    }
  }
});

test("pre-flight reports missing private sources without printing content", () => {
  const root = mkdtempSync(join(tmpdir(), "efeso-knowledge-"));
  const result = checkEfesoKnowledgeSources(root);
  assert.equal(result.complete, false);
  assert.equal(result.missing.length, 19);
  const serialized = JSON.stringify(result);
  assert.equal(/R\$|@efeso|proposta integral/i.test(serialized), false);
});
