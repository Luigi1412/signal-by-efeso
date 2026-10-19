export const RELATIONSHIP_STATUSES = [
  "unknown",
  "prospect",
  "former_client",
  "active_client",
  "strategic_account",
  "dormant",
] as const;

export const RELATIONSHIP_STRENGTHS = ["unknown", "none", "weak", "medium", "strong"] as const;
export const DATA_QUALITIES = ["unknown", "partial", "verified"] as const;
export const RELATIONSHIP_SOURCES = [
  "demo_seed",
  "manual_admin_entry",
  "existing_internal_data",
  "imported_structured_data_future",
] as const;
export const PERSON_TYPES = ["efeso_internal", "client_contact", "advisor", "partner", "other"] as const;
export const CONTACT_ROLES = [
  "account_owner",
  "sponsor",
  "relationship_holder",
  "executive_contact",
  "operational_contact",
  "former_contact",
  "unknown",
] as const;
export const CONTACT_STRENGTHS = ["unknown", "weak", "medium", "strong"] as const;
export const ACTION_QUADRANTS = ["activate", "build_access", "nurture", "monitor", "validate_access"] as const;

export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];
export type RelationshipStrength = (typeof RELATIONSHIP_STRENGTHS)[number];
export type DataQuality = (typeof DATA_QUALITIES)[number];
export type RelationshipSource = (typeof RELATIONSHIP_SOURCES)[number];
export type PersonType = (typeof PERSON_TYPES)[number];
export type ContactRole = (typeof CONTACT_ROLES)[number];
export type ContactStrength = (typeof CONTACT_STRENGTHS)[number];
export type ActionQuadrant = (typeof ACTION_QUADRANTS)[number];

export function isRelationshipStatus(value: string): value is RelationshipStatus {
  return (RELATIONSHIP_STATUSES as readonly string[]).includes(value);
}
export function isRelationshipStrength(value: string): value is RelationshipStrength {
  return (RELATIONSHIP_STRENGTHS as readonly string[]).includes(value);
}
