import "server-only";
import { requireAuthUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listCompaniesForWorkspace } from "@/server/signals/persistence";
import { searchOpportunities } from "@/server/services/opportunity-query-service";
import {
  deriveDataQuality,
  deriveRelationshipStrength,
  getAccountActionQuadrant,
} from "@/server/relationship/derivation";
import {
  getActiveAccountRelationship,
  getPerson,
  listActiveAccountRelationships,
  listActiveContacts,
  listPersons,
  type AccountRelationshipRow,
  type CompanyRelationshipContactRow,
} from "@/server/relationship/persistence";
import type { AccountActionPosition, AccountRelationshipView, CompanyContactView, RelationshipPersonView } from "@/server/relationship/types";
import type { PersonType, RelationshipSource, RelationshipStatus, RelationshipStrength, DataQuality, ContactStrength } from "@/server/relationship/taxonomy";

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

function asOpportunityLevel(value: string | null | undefined): import("@/server/opportunities/taxonomy").OpportunityLevel | null {
  if (value === "low" || value === "medium" || value === "high") return value;
  return null;
}

function toPerson(row: {
  id: string;
  display_name: string;
  email: string | null;
  organization: string;
  role_title: string | null;
  person_type: string;
  status: string;
  metadata: Record<string, unknown>;
}): RelationshipPersonView {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    organization: row.organization,
    roleTitle: row.role_title,
    personType: row.person_type as PersonType,
    status: row.status,
    demoOrigin: isDemoOrigin(row.metadata),
  };
}

async function toContact(
  workspaceId: string,
  row: CompanyRelationshipContactRow,
): Promise<CompanyContactView | null> {
  const person = await getPerson(workspaceId, row.relationship_person_id);
  if (!person) return null;
  return {
    id: row.id,
    person: toPerson(person),
    relationshipRole: row.relationship_role,
    strength: row.strength as ContactStrength,
    lastInteractionAt: row.last_interaction_at,
    notes: row.notes,
    sourceType: row.source_type,
    sourceReference: row.source_reference,
    status: row.status,
  };
}

async function hydrateRelationship(
  workspaceId: string,
  row: AccountRelationshipRow | null,
  company: { id: string; display_name: string; slug: string },
): Promise<AccountRelationshipView> {
  const contacts = row ? await listActiveContacts(workspaceId, company.id) : [];
  const views: CompanyContactView[] = [];
  for (const contact of contacts) {
    const view = await toContact(workspaceId, contact);
    if (view) views.push(view);
  }
  const owner = views.find((item) => item.relationshipRole === "account_owner") ?? null;
  const derived = deriveRelationshipStrength({
    relationshipStatus: row?.relationship_status ?? null,
    recordedStrength: row?.relationship_strength ?? null,
    hasRecord: Boolean(row),
    hasAccountOwner: Boolean(owner),
    knownContactCount: views.length,
    lastInteractionAt: row?.last_known_interaction_at ?? null,
    historicalProject: row?.relationship_status === "former_client" || row?.relationship_status === "active_client",
  });
  const quality = deriveDataQuality({
    hasRecord: Boolean(row),
    sourceType: row?.source_type ?? null,
    hasAccountOwner: Boolean(owner),
    lastInteractionAt: row?.last_known_interaction_at ?? null,
  });
  return {
    id: row?.id ?? `${company.id}-unavailable`,
    companyId: company.id,
    companyName: company.display_name,
    companySlug: company.slug,
    relationshipStatus: (row?.relationship_status ?? "unknown") as RelationshipStatus,
    relationshipStrength: (row?.relationship_strength ?? "unknown") as RelationshipStrength,
    derivedStrength: derived,
    dataQuality: (row ? quality : "unknown") as DataQuality,
    lastKnownInteractionAt: row?.last_known_interaction_at ?? null,
    relationshipSummary: row?.relationship_summary ?? null,
    sourceType: (row?.source_type ?? "existing_internal_data") as RelationshipSource,
    sourceReference: row?.source_reference ?? null,
    status: row?.status ?? "active",
    version: row?.version ?? 0,
    demoOrigin: isDemoOrigin(row?.metadata),
    accountOwner: owner,
    efesoHolders: views.filter((item) => item.person.personType === "efeso_internal"),
    clientContacts: views.filter((item) => item.person.personType === "client_contact"),
    unavailable: !row,
  };
}

export async function getCompanyRelationship(companyId: string): Promise<AccountRelationshipView | null> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const company = companies.find((item) => item.id === companyId);
  if (!company) return null;
  const row = await getActiveAccountRelationship(workspace.id, companyId);
  return hydrateRelationship(workspace.id, row, company);
}

export async function listWorkspaceRelationships(): Promise<AccountRelationshipView[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const rows = await listActiveAccountRelationships(workspace.id);
  const views: AccountRelationshipView[] = [];
  for (const company of companies) {
    const row = rows.find((item) => item.company_id === company.id) ?? null;
    views.push(await hydrateRelationship(workspace.id, row, company));
  }
  return views;
}

export async function getAccountActionPosition(companyId: string): Promise<AccountActionPosition | null> {
  const relationship = await getCompanyRelationship(companyId);
  if (!relationship) return null;
  const opportunities = await searchOpportunities({ companyId, status: "active" });
  const top = opportunities[0] ?? null;
  const relevance = asOpportunityLevel(top?.relevanceLevel);
  const quadrant = getAccountActionQuadrant({
    opportunityRelevance: relevance,
    relationshipStrength: relationship.unavailable ? "unknown" : relationship.derivedStrength,
  });
  return {
    companyId: relationship.companyId,
    companyName: relationship.companyName,
    companySlug: relationship.companySlug,
    opportunityRelevance: relevance,
    opportunityTitle: top?.title ?? null,
    relationshipStrength: relationship.unavailable ? "unknown" : relationship.derivedStrength,
    relationshipStatus: relationship.unavailable ? "unknown" : relationship.relationshipStatus,
    quadrant,
    explanation: explainQuadrant(quadrant, relevance, relationship),
    dataQuality: relationship.dataQuality,
  };
}

export async function listAccountActionPositions(): Promise<AccountActionPosition[]> {
  const relationships = await listWorkspaceRelationships();
  const positions: AccountActionPosition[] = [];
  for (const relationship of relationships) {
    const position = await getAccountActionPosition(relationship.companyId);
    if (position) positions.push(position);
  }
  return positions;
}

export async function listRelationshipPersons(): Promise<RelationshipPersonView[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const rows = await listPersons(workspace.id);
  return rows.map(toPerson);
}

function explainQuadrant(
  quadrant: AccountActionPosition["quadrant"],
  relevance: AccountActionPosition["opportunityRelevance"],
  relationship: AccountRelationshipView,
): string {
  const relevanceLabel =
    relevance === "high" ? "alta" : relevance === "medium" ? "média" : relevance === "low" ? "baixa" : "indefinida";
  const strength = relationship.unavailable ? "desconhecida" : relationship.derivedStrength;
  const strengthLabel =
    strength === "strong" ? "forte" : strength === "medium" ? "média" : strength === "weak" ? "fraca" : "desconhecida";
  if (quadrant === "validate_access") {
    return `Relevância ${relevanceLabel}. Relacionamento desconhecido — validar acesso antes de qualquer abordagem.`;
  }
  if (quadrant === "activate") {
    return `Alta relevância comercial com relacionamento ${strengthLabel} — ativar internamente.`;
  }
  if (quadrant === "build_access") {
    return `Alta relevância comercial com relacionamento ${strengthLabel} — construir acesso, sem assumir contato.`;
  }
  if (quadrant === "nurture") {
    return `Relevância média com relacionamento ${strengthLabel} — nutrir o acesso existente.`;
  }
  return `Relevância ${relevanceLabel} — monitorar, sem outreach.`;
}
