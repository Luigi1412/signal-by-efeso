import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { asRow, asRowList } from "@/server/extraction/pipeline-rows";
import type { ContactRole, PersonType, RelationshipSource, RelationshipStatus, RelationshipStrength, DataQuality } from "./taxonomy";

function admin() {
  return createPipelineAdminClient();
}

export interface RelationshipPersonRow {
  id: string;
  workspace_id: string;
  display_name: string;
  email: string | null;
  organization: string;
  role_title: string | null;
  person_type: PersonType;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AccountRelationshipRow {
  id: string;
  workspace_id: string;
  company_id: string;
  relationship_status: RelationshipStatus;
  relationship_strength: RelationshipStrength;
  data_quality: DataQuality;
  last_known_interaction_at: string | null;
  relationship_summary: string | null;
  source_type: RelationshipSource;
  source_reference: string | null;
  status: string;
  created_by: string | null;
  supersedes_relationship_id: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompanyRelationshipContactRow {
  id: string;
  workspace_id: string;
  company_id: string;
  relationship_person_id: string;
  relationship_role: ContactRole;
  strength: string;
  last_interaction_at: string | null;
  notes: string | null;
  source_type: RelationshipSource;
  source_reference: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

export async function getPerson(workspaceId: string, id: string): Promise<RelationshipPersonRow | null> {
  const { data, error } = await admin()
    .from("relationship_persons")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<RelationshipPersonRow>(data) : null;
}

export async function listPersons(workspaceId: string): Promise<RelationshipPersonRow[]> {
  const { data, error } = await admin()
    .from("relationship_persons")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("display_name");
  if (error) throw error;
  return asRowList<RelationshipPersonRow>(data);
}

export async function insertPerson(input: {
  workspaceId: string;
  displayName: string;
  email: string | null;
  organization: string;
  roleTitle: string | null;
  personType: PersonType;
  metadata?: Record<string, unknown>;
}): Promise<RelationshipPersonRow> {
  const { data, error } = await admin()
    .from("relationship_persons")
    .insert({
      workspace_id: input.workspaceId,
      display_name: input.displayName,
      email: input.email,
      organization: input.organization,
      role_title: input.roleTitle,
      person_type: input.personType,
      status: "active",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<RelationshipPersonRow>(data);
}

export async function getActiveAccountRelationship(
  workspaceId: string,
  companyId: string,
): Promise<AccountRelationshipRow | null> {
  const { data, error } = await admin()
    .from("account_relationships")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<AccountRelationshipRow>(data) : null;
}

export async function listActiveAccountRelationships(workspaceId: string): Promise<AccountRelationshipRow[]> {
  const { data, error } = await admin()
    .from("account_relationships")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw error;
  return asRowList<AccountRelationshipRow>(data);
}

export async function insertAccountRelationship(input: {
  workspaceId: string;
  companyId: string;
  relationshipStatus: RelationshipStatus;
  relationshipStrength: RelationshipStrength;
  dataQuality: DataQuality;
  lastKnownInteractionAt: string | null;
  relationshipSummary: string | null;
  sourceType: RelationshipSource;
  sourceReference: string | null;
  createdBy: string | null;
  supersedesId: string | null;
  version: number;
  metadata?: Record<string, unknown>;
}): Promise<AccountRelationshipRow> {
  const { data, error } = await admin()
    .from("account_relationships")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      relationship_status: input.relationshipStatus,
      relationship_strength: input.relationshipStrength,
      data_quality: input.dataQuality,
      last_known_interaction_at: input.lastKnownInteractionAt,
      relationship_summary: input.relationshipSummary,
      source_type: input.sourceType,
      source_reference: input.sourceReference,
      status: "active",
      created_by: input.createdBy,
      supersedes_relationship_id: input.supersedesId,
      version: input.version,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<AccountRelationshipRow>(data);
}

export async function archiveAccountRelationship(id: string): Promise<void> {
  const { error } = await admin().from("account_relationships").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}

export async function listActiveContacts(workspaceId: string, companyId: string): Promise<CompanyRelationshipContactRow[]> {
  const { data, error } = await admin()
    .from("company_relationship_contacts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at");
  if (error) throw error;
  return asRowList<CompanyRelationshipContactRow>(data);
}

export async function insertContact(input: {
  workspaceId: string;
  companyId: string;
  personId: string;
  role: ContactRole;
  strength: string;
  lastInteractionAt: string | null;
  notes: string | null;
  sourceType: RelationshipSource;
  sourceReference: string | null;
  createdBy: string | null;
}): Promise<CompanyRelationshipContactRow> {
  const { data, error } = await admin()
    .from("company_relationship_contacts")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      relationship_person_id: input.personId,
      relationship_role: input.role,
      strength: input.strength,
      last_interaction_at: input.lastInteractionAt,
      notes: input.notes,
      source_type: input.sourceType,
      source_reference: input.sourceReference,
      status: "active",
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<CompanyRelationshipContactRow>(data);
}

export async function archiveContact(id: string): Promise<void> {
  const { error } = await admin().from("company_relationship_contacts").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}
