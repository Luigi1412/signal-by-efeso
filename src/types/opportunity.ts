export type EfesoFit = "Excellent" | "Strong" | "Moderate" | "Limited";

export type EvidenceStrength = "Strong" | "Moderate" | "Weak" | "Insufficient";

export type ClientValidation = "Required" | "Recommended" | "Optional";

export interface Capability {
  id: string;
  name: string;
  practice: string;
  description: string;
}

export interface OpportunityEvidencePoint {
  text: string;
  /** Optional link into the evidence base. */
  claimId?: string;
}

/** A structured consulting case, not a dashboard card. */
export interface Opportunity {
  id: string;
  companyId: string;
  /** Short label used in snapshots and report tables. */
  shortTitle: string;
  title: string;
  /** 0–100 opportunity score. Strength labels are derived from this value. */
  score: number;
  efesoFit: EfesoFit;
  evidenceStrength: EvidenceStrength;
  clientValidation: ClientValidation;
  summary: string;
  whySignalIdentified: OpportunityEvidencePoint[];
  hypothesis: string;
  capabilityIds: string[];
  unknowns: string[];
  recommendedNextStep: string;
  discoveryQuestions: string[];
}
