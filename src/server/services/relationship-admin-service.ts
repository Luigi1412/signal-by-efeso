import "server-only";
import { requireAdminUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCompanyRow } from "@/server/signals/persistence";
import {
  archiveAccountRelationship,
  archiveContact,
  getActiveAccountRelationship,
  insertAccountRelationship,
  insertContact,
  insertPerson,
  listActiveContacts,
} from "@/server/relationship/persistence";
import { deriveDataQuality, deriveRelationshipStrength } from "@/server/relationship/derivation";
import type {
  ContactRole,
  DataQuality,
  PersonType,
  RelationshipSource,
  RelationshipStatus,
  RelationshipStrength,
} from "@/server/relationship/taxonomy";

export async function saveAccountRelationshipEntry(input: {
  companyId: string;
  relationshipStatus: RelationshipStatus;
  recordedStrength: RelationshipStrength | null;
  lastKnownInteractionAt: string | null;
  relationshipSummary: string | null;
  sourceType: RelationshipSource;
  sourceReference: string | null;
  accountOwnerPersonId: string | null;
  holderPersonIds: string[];
}): Promise<void> {
  const userId = await requireAdminUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const company = await getCompanyRow(workspace.id, input.companyId);
  if (!company) throw new Error("COMPANY_NOT_FOUND");

  const previous = await getActiveAccountRelationship(workspace.id, input.companyId);
  const contacts = previous ? await listActiveContacts(workspace.id, input.companyId) : [];
  const hasOwner = Boolean(input.accountOwnerPersonId);
  const derived = deriveRelationshipStrength({
    relationshipStatus: input.relationshipStatus,
    recordedStrength: input.recordedStrength,
    hasRecord: true,
    hasAccountOwner: hasOwner,
    knownContactCount: (input.accountOwnerPersonId ? 1 : 0) + input.holderPersonIds.length,
    lastInteractionAt: input.lastKnownInteractionAt,
    historicalProject: input.relationshipStatus === "former_client" || input.relationshipStatus === "active_client",
  });
  const quality: DataQuality = deriveDataQuality({
    hasRecord: true,
    sourceType: input.sourceType,
    hasAccountOwner: hasOwner,
    lastInteractionAt: input.lastKnownInteractionAt,
  });

  if (previous) await archiveAccountRelationship(previous.id);
  await insertAccountRelationship({
    workspaceId: workspace.id,
    companyId: input.companyId,
    relationshipStatus: input.relationshipStatus,
    relationshipStrength: derived,
    dataQuality: quality,
    lastKnownInteractionAt: input.lastKnownInteractionAt,
    relationshipSummary: input.relationshipSummary,
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    createdBy: userId,
    supersedesId: previous?.id ?? null,
    version: (previous?.version ?? 0) + 1,
    metadata: { origin: input.sourceType },
  });

  for (const contact of contacts) {
    await archiveContact(contact.id);
  }
  if (input.accountOwnerPersonId) {
    await insertContact({
      workspaceId: workspace.id,
      companyId: input.companyId,
      personId: input.accountOwnerPersonId,
      role: "account_owner",
      strength: derived === "unknown" ? "unknown" : derived === "none" ? "unknown" : derived,
      lastInteractionAt: input.lastKnownInteractionAt,
      notes: null,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      createdBy: userId,
    });
  }
  for (const personId of input.holderPersonIds) {
    if (personId === input.accountOwnerPersonId) continue;
    await insertContact({
      workspaceId: workspace.id,
      companyId: input.companyId,
      personId,
      role: "relationship_holder",
      strength: "unknown",
      lastInteractionAt: null,
      notes: null,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      createdBy: userId,
    });
  }
}

export async function createRelationshipPersonEntry(input: {
  displayName: string;
  email: string | null;
  organization: string;
  roleTitle: string | null;
  personType: PersonType;
}): Promise<string> {
  await requireAdminUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const person = await insertPerson({
    workspaceId: workspace.id,
    displayName: input.displayName,
    email: input.email,
    organization: input.organization,
    roleTitle: input.roleTitle,
    personType: input.personType,
    metadata: { origin: "manual_admin_entry" },
  });
  return person.id;
}

export type { ContactRole, RelationshipStrength };
