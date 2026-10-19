import type { OpportunityLevel } from "@/server/opportunities/taxonomy";
import type {
  ActionQuadrant,
  ContactRole,
  ContactStrength,
  DataQuality,
  PersonType,
  RelationshipSource,
  RelationshipStatus,
  RelationshipStrength,
} from "./taxonomy";

export interface RelationshipPersonView {
  id: string;
  displayName: string;
  email: string | null;
  organization: string;
  roleTitle: string | null;
  personType: PersonType;
  status: string;
  demoOrigin: boolean;
}

export interface CompanyContactView {
  id: string;
  person: RelationshipPersonView;
  relationshipRole: ContactRole;
  strength: ContactStrength;
  lastInteractionAt: string | null;
  notes: string | null;
  sourceType: RelationshipSource;
  sourceReference: string | null;
  status: string;
}

export interface AccountRelationshipView {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  relationshipStatus: RelationshipStatus;
  relationshipStrength: RelationshipStrength;
  derivedStrength: RelationshipStrength;
  dataQuality: DataQuality;
  lastKnownInteractionAt: string | null;
  relationshipSummary: string | null;
  sourceType: RelationshipSource;
  sourceReference: string | null;
  status: string;
  version: number;
  demoOrigin: boolean;
  accountOwner: CompanyContactView | null;
  efesoHolders: CompanyContactView[];
  clientContacts: CompanyContactView[];
  unavailable: boolean;
}

export interface AccountActionPosition {
  companyId: string;
  companyName: string;
  companySlug: string;
  opportunityRelevance: OpportunityLevel | null;
  opportunityTitle: string | null;
  relationshipStrength: RelationshipStrength;
  relationshipStatus: RelationshipStatus | "unknown";
  quadrant: ActionQuadrant;
  explanation: string;
  dataQuality: DataQuality;
}
