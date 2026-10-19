export const ACTION_TYPES = [
  "validate_account_context",
  "validate_relationship",
  "reconnect_existing_relationship",
  "contact_account_owner",
  "prepare_internal_brief",
  "review_relevant_case",
  "align_internal_team",
  "explore_client_need",
  "prepare_meeting_hypothesis",
  "monitor_development",
  "no_action",
  "other",
] as const;

export const FORBIDDEN_ACTION_TYPES = [
  "send_email",
  "schedule_meeting",
  "send_proposal",
  "call_client",
  "update_crm",
  "contact_ceo",
  "contact_client",
] as const;

export const ACTION_PRIORITIES = ["low", "medium", "high"] as const;
export const ACTION_CONFIDENCE_TIERS = ["direct", "supported", "inferred"] as const;
export const ACTION_RATIONALE_TYPES = [
  "opportunity_context",
  "relationship_context",
  "urgency_context",
  "efeso_context",
  "uncertainty",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];
export type ActionConfidenceTier = (typeof ACTION_CONFIDENCE_TIERS)[number];
export type ActionRationaleType = (typeof ACTION_RATIONALE_TYPES)[number];

export function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

export function isForbiddenActionType(value: string): boolean {
  return (FORBIDDEN_ACTION_TYPES as readonly string[]).includes(value);
}
