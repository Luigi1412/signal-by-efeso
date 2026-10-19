"use server";

import { z } from "zod";
import { assertEfesoAdmin, publicAccessErrorMessage } from "@/server/access/require-efeso-access";
import { saveAccountRelationshipEntry, createRelationshipPersonEntry } from "@/server/services/relationship-admin-service";
import {
  RELATIONSHIP_SOURCES,
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_STRENGTHS,
  PERSON_TYPES,
} from "@/server/relationship/taxonomy";

const saveSchema = z.object({
  companyId: z.string().uuid(),
  relationshipStatus: z.enum(RELATIONSHIP_STATUSES),
  recordedStrength: z.enum(RELATIONSHIP_STRENGTHS).nullable(),
  lastKnownInteractionAt: z.string().nullable(),
  relationshipSummary: z.string().nullable(),
  sourceType: z.enum(RELATIONSHIP_SOURCES),
  sourceReference: z.string().nullable(),
  accountOwnerPersonId: z.string().uuid().nullable(),
  holderPersonIds: z.array(z.string().uuid()),
});

export async function saveRelationshipLabAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertEfesoAdmin();
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
  const holders = formData.getAll("holderPersonIds").filter((value): value is string => typeof value === "string" && value.length > 0);
  const parsed = saveSchema.safeParse({
    companyId: formData.get("companyId"),
    relationshipStatus: formData.get("relationshipStatus"),
    recordedStrength: String(formData.get("recordedStrength") ?? "") || null,
    lastKnownInteractionAt: String(formData.get("lastKnownInteractionAt") ?? "") || null,
    relationshipSummary: String(formData.get("relationshipSummary") ?? "") || null,
    sourceType: formData.get("sourceType") ?? "manual_admin_entry",
    sourceReference: String(formData.get("sourceReference") ?? "") || null,
    accountOwnerPersonId: String(formData.get("accountOwnerPersonId") ?? "") || null,
    holderPersonIds: holders,
  });
  if (!parsed.success) return { ok: false, error: "Dados do formulário inválidos." };
  try {
    await saveAccountRelationshipEntry(parsed.data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível gravar o relacionamento." };
  }
}

const personSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().nullable(),
  organization: z.string().min(1),
  roleTitle: z.string().nullable(),
  personType: z.enum(PERSON_TYPES),
});

export async function createPersonLabAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await assertEfesoAdmin();
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
  const parsed = personSchema.safeParse({
    displayName: formData.get("displayName"),
    email: String(formData.get("email") ?? "") || null,
    organization: formData.get("organization"),
    roleTitle: String(formData.get("roleTitle") ?? "") || null,
    personType: formData.get("personType"),
  });
  if (!parsed.success) return { ok: false, error: "Dados da pessoa inválidos." };
  try {
    const id = await createRelationshipPersonEntry(parsed.data);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível criar a pessoa." };
  }
}
