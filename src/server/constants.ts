import "server-only";

export const EFESO_BRAZIL_WORKSPACE_ID = "0e8f0e50-b2a1-4c3d-9e7f-000000000001";
export const EFESO_BRAZIL_SLUG = "efeso-brazil";

export const PIPELINE_VERSION = "v0.2.0-sim";
export const RESEARCH_POLICY_VERSION = "v0.2.0-demo";

export const DEMO_MEMBER_EMAIL = "demo.member@efeso.com";
export const DEMO_ADMIN_EMAIL = "demo.admin@efeso.com";
export const DEMO_EXTERNAL_EMAIL = "outsider@gmail.com";
export const DEMO_AUTH_EMAIL = DEMO_MEMBER_EMAIL;

export const DEMO_MEMBER_PROFILE_NAME = "Demo Member";
export const DEMO_ADMIN_PROFILE_NAME = "Demo Admin";
export const DEMO_MEMBER_JOB_TITLE = "Consultor";
export const DEMO_ADMIN_JOB_TITLE = "Administrador";

export const RESEARCH_STAGE_SEQUENCE = [
  { stage: "entity_resolution", progressPercent: 10 },
  { stage: "research_planning", progressPercent: 20 },
  { stage: "source_discovery", progressPercent: 30 },
  { stage: "source_retrieval", progressPercent: 40 },
  { stage: "content_extraction", progressPercent: 50 },
  { stage: "claim_extraction", progressPercent: 55 },
  { stage: "evidence_validation", progressPercent: 65 },
  { stage: "signal_detection", progressPercent: 75 },
  { stage: "opportunity_mapping", progressPercent: 80 },
  { stage: "challenge", progressPercent: 85 },
  { stage: "quality_gate", progressPercent: 90 },
] as const;

export type ResearchStage = (typeof RESEARCH_STAGE_SEQUENCE)[number]["stage"] | "report_generation" | "completed";
