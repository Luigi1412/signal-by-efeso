
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "access_audit_events": {
                  Row: {
                    "actor_user_id": string | null,"created_at": string,"email_domain": string | null,"event_type": string,"id": string,"outcome": string,"workspace_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"created_at"?: string,"email_domain"?: string | null,"event_type": string,"id"?: string,"outcome": string,"workspace_id"?: string | null
                  }
                  Update: {
                    "actor_user_id"?: string | null,"created_at"?: string,"email_domain"?: string | null,"event_type"?: string,"id"?: string,"outcome"?: string,"workspace_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "access_audit_events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"account_intelligence": {
                  Row: {
                    "change_summary": string | null,"company_id": string,"created_at": string,"executive_summary": string,"generated_at": string,"headline": string,"id": string,"investment_summary": string | null,"metadata": NonNullable<Json>,"operating_context_summary": string | null,"origin_candidate_id": string | null,"origin_model_run_id": string | null,"period_end": string | null,"period_start": string | null,"pressure_summary": string | null,"risk_summary": string | null,"sections": NonNullable<Json>,"status": string,"strategic_direction": string | null,"supersedes_account_intelligence_id": string | null,"updated_at": string,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "change_summary"?: string | null,"company_id": string,"created_at"?: string,"executive_summary": string,"generated_at"?: string,"headline": string,"id"?: string,"investment_summary"?: string | null,"metadata"?: NonNullable<Json>,"operating_context_summary"?: string | null,"origin_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"pressure_summary"?: string | null,"risk_summary"?: string | null,"sections"?: NonNullable<Json>,"status"?: string,"strategic_direction"?: string | null,"supersedes_account_intelligence_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "change_summary"?: string | null,"company_id"?: string,"created_at"?: string,"executive_summary"?: string,"generated_at"?: string,"headline"?: string,"id"?: string,"investment_summary"?: string | null,"metadata"?: NonNullable<Json>,"operating_context_summary"?: string | null,"origin_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"pressure_summary"?: string | null,"risk_summary"?: string | null,"sections"?: NonNullable<Json>,"status"?: string,"strategic_direction"?: string | null,"supersedes_account_intelligence_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_intelligence_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_origin_candidate_workspace_fk"
      columns: ["origin_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "account_intelligence_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_origin_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_supersedes_workspace_fk"
      columns: ["supersedes_account_intelligence_id","workspace_id"]
isOneToOne: false
      referencedRelation: "account_intelligence"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"account_intelligence_candidate_validations": {
                  Row: {
                    "account_intelligence_candidate_id": string,"created_at": string,"details": NonNullable<Json>,"id": string,"message": string | null,"model_run_id": string | null,"result": string,"severity": string,"validation_round": number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_intelligence_candidate_id": string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result": string,"severity": string,"validation_round"?: number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  Update: {
                    "account_intelligence_candidate_id"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result"?: string,"severity"?: string,"validation_round"?: number,"validator_code"?: string,"validator_type"?: string,"validator_version"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_intelligence_candidate_validations_candidate_workspace_"
      columns: ["account_intelligence_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "account_intelligence_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidate_validations_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidate_validations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"account_intelligence_candidates": {
                  Row: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at": string,"extraction_model_run_id": string,"id": string,"metadata": NonNullable<Json>,"promoted_account_intelligence_id": string | null,"promoted_at": string | null,"proposed_change_summary": string | null,"proposed_executive_summary": string,"proposed_headline": string,"proposed_investment_summary": string | null,"proposed_operating_context_summary": string | null,"proposed_period_end": string | null,"proposed_period_start": string | null,"proposed_pressure_summary": string | null,"proposed_risk_summary": string | null,"proposed_sections": NonNullable<Json>,"proposed_signal_links": NonNullable<Json>,"proposed_strategic_direction": string | null,"proposed_tensions": NonNullable<Json>,"proposed_themes": NonNullable<Json>,"rejection_reason_code": string | null,"rejection_reason_text": string | null,"research_run_id": string,"source_snapshot_id": string | null,"status": string,"validated_at": string | null,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at"?: string,"extraction_model_run_id": string,"id"?: string,"metadata"?: NonNullable<Json>,"promoted_account_intelligence_id"?: string | null,"promoted_at"?: string | null,"proposed_change_summary"?: string | null,"proposed_executive_summary": string,"proposed_headline": string,"proposed_investment_summary"?: string | null,"proposed_operating_context_summary"?: string | null,"proposed_period_end"?: string | null,"proposed_period_start"?: string | null,"proposed_pressure_summary"?: string | null,"proposed_risk_summary"?: string | null,"proposed_sections"?: NonNullable<Json>,"proposed_signal_links"?: NonNullable<Json>,"proposed_strategic_direction"?: string | null,"proposed_tensions"?: NonNullable<Json>,"proposed_themes"?: NonNullable<Json>,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id": string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"candidate_fingerprint"?: string,"company_id"?: string,"created_at"?: string,"extraction_model_run_id"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"promoted_account_intelligence_id"?: string | null,"promoted_at"?: string | null,"proposed_change_summary"?: string | null,"proposed_executive_summary"?: string,"proposed_headline"?: string,"proposed_investment_summary"?: string | null,"proposed_operating_context_summary"?: string | null,"proposed_period_end"?: string | null,"proposed_period_start"?: string | null,"proposed_pressure_summary"?: string | null,"proposed_risk_summary"?: string | null,"proposed_sections"?: NonNullable<Json>,"proposed_signal_links"?: NonNullable<Json>,"proposed_strategic_direction"?: string | null,"proposed_tensions"?: NonNullable<Json>,"proposed_themes"?: NonNullable<Json>,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id"?: string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_intelligence_candidates_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidates_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidates_origin_run_workspace_fk"
      columns: ["extraction_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidates_promoted_fk"
      columns: ["promoted_account_intelligence_id","workspace_id"]
isOneToOne: false
      referencedRelation: "account_intelligence"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidates_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidates_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"account_intelligence_signals": {
                  Row: {
                    "account_intelligence_id": string,"created_at": string,"id": string,"relationship_type": string,"signal_id": string,"weight": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_intelligence_id": string,"created_at"?: string,"id"?: string,"relationship_type": string,"signal_id": string,"weight": number,"workspace_id": string
                  }
                  Update: {
                    "account_intelligence_id"?: string,"created_at"?: string,"id"?: string,"relationship_type"?: string,"signal_id"?: string,"weight"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_intelligence_signals_ai_workspace_fk"
      columns: ["account_intelligence_id","workspace_id"]
isOneToOne: false
      referencedRelation: "account_intelligence"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_signals_signal_workspace_fk"
      columns: ["signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_signals_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"account_intelligence_themes": {
                  Row: {
                    "account_intelligence_id": string,"created_at": string,"id": string,"last_seen_at": string | null,"signal_count": number,"tag_id": string,"weighted_importance": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_intelligence_id": string,"created_at"?: string,"id"?: string,"last_seen_at"?: string | null,"signal_count": number,"tag_id": string,"weighted_importance": string,"workspace_id": string
                  }
                  Update: {
                    "account_intelligence_id"?: string,"created_at"?: string,"id"?: string,"last_seen_at"?: string | null,"signal_count"?: number,"tag_id"?: string,"weighted_importance"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_intelligence_themes_ai_workspace_fk"
      columns: ["account_intelligence_id","workspace_id"]
isOneToOne: false
      referencedRelation: "account_intelligence"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_intelligence_themes_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "knowledge_tags"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_intelligence_themes_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"account_relationships": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"data_quality": string,"id": string,"last_known_interaction_at": string | null,"metadata": NonNullable<Json>,"relationship_status": string,"relationship_strength": string,"relationship_summary": string | null,"source_reference": string | null,"source_type": string,"status": string,"supersedes_relationship_id": string | null,"updated_at": string,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"data_quality"?: string,"id"?: string,"last_known_interaction_at"?: string | null,"metadata"?: NonNullable<Json>,"relationship_status"?: string,"relationship_strength"?: string,"relationship_summary"?: string | null,"source_reference"?: string | null,"source_type": string,"status"?: string,"supersedes_relationship_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"data_quality"?: string,"id"?: string,"last_known_interaction_at"?: string | null,"metadata"?: NonNullable<Json>,"relationship_status"?: string,"relationship_strength"?: string,"relationship_summary"?: string | null,"source_reference"?: string | null,"source_type"?: string,"status"?: string,"supersedes_relationship_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_relationships_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_relationships_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_relationships_supersedes_fk"
      columns: ["supersedes_relationship_id"]
isOneToOne: false
      referencedRelation: "account_relationships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_relationships_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"account_tensions": {
                  Row: {
                    "account_intelligence_id": string,"created_at": string,"explanation": string,"id": string,"signal_a_id": string,"signal_b_id": string,"status": string,"tension_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_intelligence_id": string,"created_at"?: string,"explanation": string,"id"?: string,"signal_a_id": string,"signal_b_id": string,"status"?: string,"tension_type": string,"workspace_id": string
                  }
                  Update: {
                    "account_intelligence_id"?: string,"created_at"?: string,"explanation"?: string,"id"?: string,"signal_a_id"?: string,"signal_b_id"?: string,"status"?: string,"tension_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_tensions_ai_workspace_fk"
      columns: ["account_intelligence_id","workspace_id"]
isOneToOne: false
      referencedRelation: "account_intelligence"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_tensions_signal_a_workspace_fk"
      columns: ["signal_a_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_tensions_signal_b_workspace_fk"
      columns: ["signal_b_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "account_tensions_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"analyses": {
                  Row: {
                    "additional_instructions": string | null,"analysis_type": string,"archived_at": string | null,"company_id": string,"created_at": string,"created_by_user_id": string | null,"id": string,"primary_country_code": string,"report_locale": string,"research_focus": string,"scope_end_date": string | null,"scope_start_date": string | null,"status": string,"title": string,"ui_locale": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_instructions"?: string | null,"analysis_type"?: string,"archived_at"?: string | null,"company_id": string,"created_at"?: string,"created_by_user_id"?: string | null,"id"?: string,"primary_country_code"?: string,"report_locale"?: string,"research_focus"?: string,"scope_end_date"?: string | null,"scope_start_date"?: string | null,"status"?: string,"title": string,"ui_locale"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "additional_instructions"?: string | null,"analysis_type"?: string,"archived_at"?: string | null,"company_id"?: string,"created_at"?: string,"created_by_user_id"?: string | null,"id"?: string,"primary_country_code"?: string,"report_locale"?: string,"research_focus"?: string,"scope_end_date"?: string | null,"scope_start_date"?: string | null,"status"?: string,"title"?: string,"ui_locale"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "analyses_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "analyses_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"claim_candidate_evidence": {
                  Row: {
                    "char_end": number | null,"char_start": number | null,"citation_order": number,"claim_candidate_id": string,"created_at": string,"exact_quote": string,"id": string,"origin_model_run_id": string,"proposed_directness": string | null,"relationship": string,"source_content_block_id": string,"source_snapshot_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "char_end"?: number | null,"char_start"?: number | null,"citation_order"?: number,"claim_candidate_id": string,"created_at"?: string,"exact_quote": string,"id"?: string,"origin_model_run_id": string,"proposed_directness"?: string | null,"relationship"?: string,"source_content_block_id": string,"source_snapshot_id": string,"workspace_id": string
                  }
                  Update: {
                    "char_end"?: number | null,"char_start"?: number | null,"citation_order"?: number,"claim_candidate_id"?: string,"created_at"?: string,"exact_quote"?: string,"id"?: string,"origin_model_run_id"?: string,"proposed_directness"?: string | null,"relationship"?: string,"source_content_block_id"?: string,"source_snapshot_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "claim_candidate_evidence_block_snapshot_fk"
      columns: ["source_content_block_id","workspace_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "source_content_blocks"
      referencedColumns: ["id","workspace_id","source_snapshot_id"]
    },{
      foreignKeyName: "claim_candidate_evidence_candidate_snapshot_fk"
      columns: ["claim_candidate_id","workspace_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "claim_candidates"
      referencedColumns: ["id","workspace_id","source_snapshot_id"]
    },{
      foreignKeyName: "claim_candidate_evidence_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "claim_candidate_evidence_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"claim_candidate_validations": {
                  Row: {
                    "claim_candidate_id": string,"created_at": string,"details": NonNullable<Json>,"id": string,"message": string | null,"model_run_id": string | null,"result": string,"severity": string,"validation_round": number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_candidate_id": string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result": string,"severity": string,"validation_round"?: number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  Update: {
                    "claim_candidate_id"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result"?: string,"severity"?: string,"validation_round"?: number,"validator_code"?: string,"validator_type"?: string,"validator_version"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "claim_candidate_validations_candidate_workspace_fk"
      columns: ["claim_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "claim_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "claim_candidate_validations_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "claim_candidate_validations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"claim_candidates": {
                  Row: {
                    "analysis_id": string,"as_of_date": string | null,"assertion_mode": string,"candidate_fingerprint": string,"city": string | null,"claim_category": string,"claim_type": string,"company_id": string,"country_code": string | null,"created_at": string,"currency_code": string | null,"entity_id": string | null,"geography_level": string | null,"id": string,"metric_name": string | null,"model_extraction_confidence": number | null,"numeric_value": number | null,"origin_model_run_id": string,"period_end": string | null,"period_start": string | null,"period_type": string | null,"promoted_at": string | null,"proposed_statement": string,"rejection_reason_code": string | null,"rejection_reason_text": string | null,"research_run_id": string,"scale": string | null,"source_snapshot_id": string,"state_region": string | null,"status": string,"unit": string | null,"validated_at": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"as_of_date"?: string | null,"assertion_mode"?: string,"candidate_fingerprint": string,"city"?: string | null,"claim_category": string,"claim_type": string,"company_id": string,"country_code"?: string | null,"created_at"?: string,"currency_code"?: string | null,"entity_id"?: string | null,"geography_level"?: string | null,"id"?: string,"metric_name"?: string | null,"model_extraction_confidence"?: number | null,"numeric_value"?: number | null,"origin_model_run_id": string,"period_end"?: string | null,"period_start"?: string | null,"period_type"?: string | null,"promoted_at"?: string | null,"proposed_statement": string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id": string,"scale"?: string | null,"source_snapshot_id": string,"state_region"?: string | null,"status"?: string,"unit"?: string | null,"validated_at"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"as_of_date"?: string | null,"assertion_mode"?: string,"candidate_fingerprint"?: string,"city"?: string | null,"claim_category"?: string,"claim_type"?: string,"company_id"?: string,"country_code"?: string | null,"created_at"?: string,"currency_code"?: string | null,"entity_id"?: string | null,"geography_level"?: string | null,"id"?: string,"metric_name"?: string | null,"model_extraction_confidence"?: number | null,"numeric_value"?: number | null,"origin_model_run_id"?: string,"period_end"?: string | null,"period_start"?: string | null,"period_type"?: string | null,"promoted_at"?: string | null,"proposed_statement"?: string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id"?: string,"scale"?: string | null,"source_snapshot_id"?: string,"state_region"?: string | null,"status"?: string,"unit"?: string | null,"validated_at"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "claim_candidates_analysis_company_fk"
      columns: ["analysis_id","workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id","company_id"]
    },{
      foreignKeyName: "claim_candidates_entity_company_fk"
      columns: ["entity_id","company_id"]
isOneToOne: false
      referencedRelation: "company_entities"
      referencedColumns: ["id","company_id"]
    },{
      foreignKeyName: "claim_candidates_origin_run_scope_fk"
      columns: ["origin_model_run_id","workspace_id","analysis_id","research_run_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id","analysis_id","research_run_id","source_snapshot_id"]
    },{
      foreignKeyName: "claim_candidates_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "claim_candidates_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "claim_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"claim_evidence": {
                  Row: {
                    "claim_id": string,"created_at": string,"directness": string,"evidence_fragment_id": string,"id": string,"relationship": string,"relevance_score": number | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_id": string,"created_at"?: string,"directness": string,"evidence_fragment_id": string,"id"?: string,"relationship": string,"relevance_score"?: number | null,"workspace_id": string
                  }
                  Update: {
                    "claim_id"?: string,"created_at"?: string,"directness"?: string,"evidence_fragment_id"?: string,"id"?: string,"relationship"?: string,"relevance_score"?: number | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "claim_evidence_claim_workspace_fk"
      columns: ["claim_id","workspace_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "claim_evidence_fragment_workspace_fk"
      columns: ["evidence_fragment_id","workspace_id"]
isOneToOne: false
      referencedRelation: "evidence_fragments"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "claim_evidence_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"claims": {
                  Row: {
                    "analysis_id": string,"as_of_date": string | null,"assertion_mode": string,"city": string | null,"claim_category": string,"claim_status": string,"claim_type": string,"company_id": string,"confidence_method_version": string | null,"confidence_score": number | null,"country_code": string | null,"created_at": string,"currency_code": string | null,"entity_id": string | null,"geography_level": string | null,"id": string,"metric_name": string | null,"numeric_value": number | null,"origin_claim_candidate_id": string | null,"originating_research_run_id": string,"period_end": string | null,"period_start": string | null,"period_type": string | null,"review_status": string,"reviewed_at": string | null,"reviewed_by_user_id": string | null,"scale": string | null,"state_region": string | null,"statement": string,"supersedes_claim_id": string | null,"unit": string | null,"verification_status": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"as_of_date"?: string | null,"assertion_mode"?: string,"city"?: string | null,"claim_category": string,"claim_status"?: string,"claim_type"?: string,"company_id": string,"confidence_method_version"?: string | null,"confidence_score"?: number | null,"country_code"?: string | null,"created_at"?: string,"currency_code"?: string | null,"entity_id"?: string | null,"geography_level"?: string | null,"id"?: string,"metric_name"?: string | null,"numeric_value"?: number | null,"origin_claim_candidate_id"?: string | null,"originating_research_run_id": string,"period_end"?: string | null,"period_start"?: string | null,"period_type"?: string | null,"review_status"?: string,"reviewed_at"?: string | null,"reviewed_by_user_id"?: string | null,"scale"?: string | null,"state_region"?: string | null,"statement": string,"supersedes_claim_id"?: string | null,"unit"?: string | null,"verification_status"?: string,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"as_of_date"?: string | null,"assertion_mode"?: string,"city"?: string | null,"claim_category"?: string,"claim_status"?: string,"claim_type"?: string,"company_id"?: string,"confidence_method_version"?: string | null,"confidence_score"?: number | null,"country_code"?: string | null,"created_at"?: string,"currency_code"?: string | null,"entity_id"?: string | null,"geography_level"?: string | null,"id"?: string,"metric_name"?: string | null,"numeric_value"?: number | null,"origin_claim_candidate_id"?: string | null,"originating_research_run_id"?: string,"period_end"?: string | null,"period_start"?: string | null,"period_type"?: string | null,"review_status"?: string,"reviewed_at"?: string | null,"reviewed_by_user_id"?: string | null,"scale"?: string | null,"state_region"?: string | null,"statement"?: string,"supersedes_claim_id"?: string | null,"unit"?: string | null,"verification_status"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "claims_analysis_workspace_company_fk"
      columns: ["analysis_id","workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id","company_id"]
    },{
      foreignKeyName: "claims_entity_company_fk"
      columns: ["entity_id","company_id"]
isOneToOne: false
      referencedRelation: "company_entities"
      referencedColumns: ["id","company_id"]
    },{
      foreignKeyName: "claims_origin_candidate_scope_fk"
      columns: ["origin_claim_candidate_id","workspace_id","analysis_id","company_id"]
isOneToOne: false
      referencedRelation: "claim_candidates"
      referencedColumns: ["id","workspace_id","analysis_id","company_id"]
    },{
      foreignKeyName: "claims_run_analysis_workspace_fk"
      columns: ["originating_research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "claims_supersedes_same_scope_fk"
      columns: ["supersedes_claim_id","workspace_id","analysis_id","company_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id","workspace_id","analysis_id","company_id"]
    },{
      foreignKeyName: "claims_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "archived_at": string | null,"company_type": string,"created_at": string,"description": string | null,"display_name": string,"id": string,"industry": string | null,"last_researched_at": string | null,"primary_country_code": string | null,"primary_domain": string | null,"primary_website_url": string | null,"resolution_status": string,"resolved_at": string | null,"slug": string,"subindustry": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"company_type"?: string,"created_at"?: string,"description"?: string | null,"display_name": string,"id"?: string,"industry"?: string | null,"last_researched_at"?: string | null,"primary_country_code"?: string | null,"primary_domain"?: string | null,"primary_website_url"?: string | null,"resolution_status"?: string,"resolved_at"?: string | null,"slug": string,"subindustry"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"company_type"?: string,"created_at"?: string,"description"?: string | null,"display_name"?: string,"id"?: string,"industry"?: string | null,"last_researched_at"?: string | null,"primary_country_code"?: string | null,"primary_domain"?: string | null,"primary_website_url"?: string | null,"resolution_status"?: string,"resolved_at"?: string | null,"slug"?: string,"subindustry"?: string | null,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"company_aliases": {
                  Row: {
                    "alias": string,"company_id": string,"created_at": string,"id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"company_id": string,"created_at"?: string,"id"?: string,"workspace_id": string
                  }
                  Update: {
                    "alias"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_aliases_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "company_aliases_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"company_entities": {
                  Row: {
                    "address": string | null,"archived_at": string | null,"city": string | null,"company_id": string,"country_code": string | null,"created_at": string,"display_name": string,"entity_type": string,"id": string,"legal_name": string | null,"metadata": NonNullable<Json>,"operational_status": string,"parent_entity_id": string | null,"state_region": string | null,"updated_at": string,"valid_from": string | null,"valid_to": string | null,"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"archived_at"?: string | null,"city"?: string | null,"company_id": string,"country_code"?: string | null,"created_at"?: string,"display_name": string,"entity_type": string,"id"?: string,"legal_name"?: string | null,"metadata"?: NonNullable<Json>,"operational_status"?: string,"parent_entity_id"?: string | null,"state_region"?: string | null,"updated_at"?: string,"valid_from"?: string | null,"valid_to"?: string | null,"website_url"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"archived_at"?: string | null,"city"?: string | null,"company_id"?: string,"country_code"?: string | null,"created_at"?: string,"display_name"?: string,"entity_type"?: string,"id"?: string,"legal_name"?: string | null,"metadata"?: NonNullable<Json>,"operational_status"?: string,"parent_entity_id"?: string | null,"state_region"?: string | null,"updated_at"?: string,"valid_from"?: string | null,"valid_to"?: string | null,"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_entities_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_entities_parent_same_company_fk"
      columns: ["parent_entity_id","company_id"]
isOneToOne: false
      referencedRelation: "company_entities"
      referencedColumns: ["id","company_id"]
    }
                  ]
                },"company_relationship_contacts": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"id": string,"last_interaction_at": string | null,"notes": string | null,"relationship_person_id": string,"relationship_role": string,"source_reference": string | null,"source_type": string,"status": string,"strength": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_interaction_at"?: string | null,"notes"?: string | null,"relationship_person_id": string,"relationship_role": string,"source_reference"?: string | null,"source_type": string,"status"?: string,"strength"?: string,"workspace_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_interaction_at"?: string | null,"notes"?: string | null,"relationship_person_id"?: string,"relationship_role"?: string,"source_reference"?: string | null,"source_type"?: string,"status"?: string,"strength"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_relationship_contacts_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "company_relationship_contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_relationship_contacts_person_workspace_fk"
      columns: ["relationship_person_id","workspace_id"]
isOneToOne: false
      referencedRelation: "relationship_persons"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "company_relationship_contacts_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"efeso_fit_candidate_validations": {
                  Row: {
                    "created_at": string,"details": NonNullable<Json>,"efeso_fit_candidate_id": string,"id": string,"message": string | null,"model_run_id": string | null,"result": string,"severity": string,"validation_round": number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"efeso_fit_candidate_id": string,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result": string,"severity": string,"validation_round"?: number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"efeso_fit_candidate_id"?: string,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result"?: string,"severity"?: string,"validation_round"?: number,"validator_code"?: string,"validator_type"?: string,"validator_version"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "efeso_fit_candidate_validations_candidate_workspace_fk"
      columns: ["efeso_fit_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_fit_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidate_validations_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidate_validations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"efeso_fit_candidates": {
                  Row: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at": string,"id": string,"knowledge_object_id": string,"metadata": NonNullable<Json>,"model_run_id": string | null,"promoted_at": string | null,"promoted_fit_id": string | null,"proposed_components": NonNullable<Json>,"proposed_fit_level": string,"proposed_fit_score": number,"proposed_rationale": string,"rejection_reason_code": string | null,"rejection_reason_text": string | null,"research_run_id": string,"source_snapshot_id": string | null,"status": string,"validated_at": string | null,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at"?: string,"id"?: string,"knowledge_object_id": string,"metadata"?: NonNullable<Json>,"model_run_id"?: string | null,"promoted_at"?: string | null,"promoted_fit_id"?: string | null,"proposed_components"?: NonNullable<Json>,"proposed_fit_level": string,"proposed_fit_score": number,"proposed_rationale": string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id": string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"candidate_fingerprint"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"knowledge_object_id"?: string,"metadata"?: NonNullable<Json>,"model_run_id"?: string | null,"promoted_at"?: string | null,"promoted_fit_id"?: string | null,"proposed_components"?: NonNullable<Json>,"proposed_fit_level"?: string,"proposed_fit_score"?: number,"proposed_rationale"?: string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id"?: string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "efeso_fit_candidates_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidates_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidates_knowledge_workspace_fk"
      columns: ["knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidates_promoted_fk"
      columns: ["promoted_fit_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_fits"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidates_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidates_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidates_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"efeso_fit_components": {
                  Row: {
                    "component_type": string,"component_value": string,"contribution": number,"created_at": string,"efeso_fit_id": string,"explanation": string,"id": string,"source_id": string | null,"source_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "component_type": string,"component_value": string,"contribution": number,"created_at"?: string,"efeso_fit_id": string,"explanation": string,"id"?: string,"source_id"?: string | null,"source_type": string,"workspace_id": string
                  }
                  Update: {
                    "component_type"?: string,"component_value"?: string,"contribution"?: number,"created_at"?: string,"efeso_fit_id"?: string,"explanation"?: string,"id"?: string,"source_id"?: string | null,"source_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "efeso_fit_components_fit_workspace_fk"
      columns: ["efeso_fit_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_fits"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fit_components_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"efeso_fits": {
                  Row: {
                    "company_id": string,"created_at": string,"fit_level": string,"fit_reason_summary": string,"fit_score": number | null,"id": string,"knowledge_object_id": string,"metadata": NonNullable<Json>,"origin_candidate_id": string | null,"origin_model_run_id": string | null,"status": string,"supersedes_fit_id": string | null,"updated_at": string,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"fit_level": string,"fit_reason_summary": string,"fit_score"?: number | null,"id"?: string,"knowledge_object_id": string,"metadata"?: NonNullable<Json>,"origin_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"status"?: string,"supersedes_fit_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"fit_level"?: string,"fit_reason_summary"?: string,"fit_score"?: number | null,"id"?: string,"knowledge_object_id"?: string,"metadata"?: NonNullable<Json>,"origin_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"status"?: string,"supersedes_fit_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "efeso_fits_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fits_knowledge_workspace_fk"
      columns: ["knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fits_origin_candidate_workspace_fk"
      columns: ["origin_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_fit_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fits_origin_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fits_supersedes_workspace_fk"
      columns: ["supersedes_fit_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_fits"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_fits_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"efeso_knowledge_objects": {
                  Row: {
                    "approved_for_display": boolean,"approved_for_matching": boolean,"canonical_name": string,"client_attribution": string,"commercial_terms_present": boolean,"confidentiality_level": string,"created_at": string,"effective_from": string | null,"effective_to": string | null,"id": string,"knowledge_nature": string,"metadata": NonNullable<Json>,"normalized_name": string,"object_type": string,"origin_candidate_id": string | null,"origin_model_run_id": string | null,"outcome_status": string,"primary_content_block_id": string | null,"short_description": string,"source_document_type": string | null,"source_snapshot_id": string,"stable_key": string | null,"status": string,"supersedes_object_id": string | null,"updated_at": string,"visibility_level": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_for_display"?: boolean,"approved_for_matching"?: boolean,"canonical_name": string,"client_attribution"?: string,"commercial_terms_present"?: boolean,"confidentiality_level"?: string,"created_at"?: string,"effective_from"?: string | null,"effective_to"?: string | null,"id"?: string,"knowledge_nature"?: string,"metadata"?: NonNullable<Json>,"normalized_name": string,"object_type": string,"origin_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"outcome_status"?: string,"primary_content_block_id"?: string | null,"short_description": string,"source_document_type"?: string | null,"source_snapshot_id": string,"stable_key"?: string | null,"status"?: string,"supersedes_object_id"?: string | null,"updated_at"?: string,"visibility_level"?: string,"workspace_id": string
                  }
                  Update: {
                    "approved_for_display"?: boolean,"approved_for_matching"?: boolean,"canonical_name"?: string,"client_attribution"?: string,"commercial_terms_present"?: boolean,"confidentiality_level"?: string,"created_at"?: string,"effective_from"?: string | null,"effective_to"?: string | null,"id"?: string,"knowledge_nature"?: string,"metadata"?: NonNullable<Json>,"normalized_name"?: string,"object_type"?: string,"origin_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"outcome_status"?: string,"primary_content_block_id"?: string | null,"short_description"?: string,"source_document_type"?: string | null,"source_snapshot_id"?: string,"stable_key"?: string | null,"status"?: string,"supersedes_object_id"?: string | null,"updated_at"?: string,"visibility_level"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "efeso_knowledge_objects_block_snapshot_fk"
      columns: ["primary_content_block_id","workspace_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "source_content_blocks"
      referencedColumns: ["id","workspace_id","source_snapshot_id"]
    },{
      foreignKeyName: "efeso_knowledge_objects_origin_candidate_workspace_fk"
      columns: ["origin_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "knowledge_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_knowledge_objects_origin_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_knowledge_objects_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_knowledge_objects_supersedes_workspace_fk"
      columns: ["supersedes_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "efeso_knowledge_objects_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"evidence_fragments": {
                  Row: {
                    "char_end": number | null,"char_start": number | null,"context_after": string | null,"context_before": string | null,"created_at": string,"excerpt": string,"extraction_confidence": number | null,"extraction_method": string,"fragment_type": string,"id": string,"locator": NonNullable<Json>,"page_number": number | null,"section_title": string | null,"source_content_block_id": string | null,"source_snapshot_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "char_end"?: number | null,"char_start"?: number | null,"context_after"?: string | null,"context_before"?: string | null,"created_at"?: string,"excerpt": string,"extraction_confidence"?: number | null,"extraction_method"?: string,"fragment_type": string,"id"?: string,"locator"?: NonNullable<Json>,"page_number"?: number | null,"section_title"?: string | null,"source_content_block_id"?: string | null,"source_snapshot_id": string,"workspace_id": string
                  }
                  Update: {
                    "char_end"?: number | null,"char_start"?: number | null,"context_after"?: string | null,"context_before"?: string | null,"created_at"?: string,"excerpt"?: string,"extraction_confidence"?: number | null,"extraction_method"?: string,"fragment_type"?: string,"id"?: string,"locator"?: NonNullable<Json>,"page_number"?: number | null,"section_title"?: string | null,"source_content_block_id"?: string | null,"source_snapshot_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evidence_fragments_block_snapshot_fk"
      columns: ["source_content_block_id","workspace_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "source_content_blocks"
      referencedColumns: ["id","workspace_id","source_snapshot_id"]
    },{
      foreignKeyName: "evidence_fragments_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "evidence_fragments_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"external_research_events": {
                  Row: {
                    "actor_user_id": string | null,"created_at": string,"event_type": string,"id": string,"payload": NonNullable<Json>,"research_run_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"created_at"?: string,"event_type": string,"id"?: string,"payload"?: NonNullable<Json>,"research_run_id": string,"workspace_id": string
                  }
                  Update: {
                    "actor_user_id"?: string | null,"created_at"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"research_run_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "external_research_events_run_workspace_fk"
      columns: ["research_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "external_research_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "external_research_events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"external_research_runs": {
                  Row: {
                    "accepted_source_count": number,"analysis_id": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"failure_code": string | null,"failure_reason": string | null,"id": string,"normalized_query": string,"rejected_source_count": number,"requested_country": string | null,"requested_industry": string | null,"requested_query": string,"research_run_id": string | null,"resolution_payload": NonNullable<Json>,"resolved_company_id": string | null,"source_count": number,"started_at": string,"status": string,"time_horizon_months": number,"unavailable_source_count": number,"updated_at": string,"worker_heartbeat_at": string | null,"worker_id": string | null,"worker_lock_until": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_source_count"?: number,"analysis_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"failure_code"?: string | null,"failure_reason"?: string | null,"id"?: string,"normalized_query": string,"rejected_source_count"?: number,"requested_country"?: string | null,"requested_industry"?: string | null,"requested_query": string,"research_run_id"?: string | null,"resolution_payload"?: NonNullable<Json>,"resolved_company_id"?: string | null,"source_count"?: number,"started_at"?: string,"status"?: string,"time_horizon_months"?: number,"unavailable_source_count"?: number,"updated_at"?: string,"worker_heartbeat_at"?: string | null,"worker_id"?: string | null,"worker_lock_until"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "accepted_source_count"?: number,"analysis_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"failure_code"?: string | null,"failure_reason"?: string | null,"id"?: string,"normalized_query"?: string,"rejected_source_count"?: number,"requested_country"?: string | null,"requested_industry"?: string | null,"requested_query"?: string,"research_run_id"?: string | null,"resolution_payload"?: NonNullable<Json>,"resolved_company_id"?: string | null,"source_count"?: number,"started_at"?: string,"status"?: string,"time_horizon_months"?: number,"unavailable_source_count"?: number,"updated_at"?: string,"worker_heartbeat_at"?: string | null,"worker_id"?: string | null,"worker_lock_until"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "external_research_runs_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "external_research_runs_company_workspace_fk"
      columns: ["resolved_company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "external_research_runs_run_workspace_fk"
      columns: ["research_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "external_research_runs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"external_source_candidates": {
                  Row: {
                    "canonical_url": string | null,"content_hash": string | null,"created_at": string,"discovered_at": string,"id": string,"normalized_url": string,"published_at": string | null,"publisher": string,"rejection_reason": string | null,"research_run_id": string,"snapshot_id": string | null,"source_id": string | null,"source_quality": string,"source_tier": number,"source_type": string,"status": string,"title": string | null,"url": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canonical_url"?: string | null,"content_hash"?: string | null,"created_at"?: string,"discovered_at"?: string,"id"?: string,"normalized_url": string,"published_at"?: string | null,"publisher": string,"rejection_reason"?: string | null,"research_run_id": string,"snapshot_id"?: string | null,"source_id"?: string | null,"source_quality": string,"source_tier": number,"source_type": string,"status"?: string,"title"?: string | null,"url": string,"workspace_id": string
                  }
                  Update: {
                    "canonical_url"?: string | null,"content_hash"?: string | null,"created_at"?: string,"discovered_at"?: string,"id"?: string,"normalized_url"?: string,"published_at"?: string | null,"publisher"?: string,"rejection_reason"?: string | null,"research_run_id"?: string,"snapshot_id"?: string | null,"source_id"?: string | null,"source_quality"?: string,"source_tier"?: number,"source_type"?: string,"status"?: string,"title"?: string | null,"url"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "external_source_candidates_run_workspace_fk"
      columns: ["research_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "external_research_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "external_source_candidates_snapshot_workspace_fk"
      columns: ["snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "external_source_candidates_source_workspace_fk"
      columns: ["source_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "external_source_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_candidate_evidence": {
                  Row: {
                    "char_end": number | null,"char_start": number | null,"citation_order": number,"created_at": string,"exact_quote": string,"id": string,"knowledge_candidate_id": string,"origin_model_run_id": string,"source_content_block_id": string,"source_snapshot_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "char_end"?: number | null,"char_start"?: number | null,"citation_order"?: number,"created_at"?: string,"exact_quote": string,"id"?: string,"knowledge_candidate_id": string,"origin_model_run_id": string,"source_content_block_id": string,"source_snapshot_id": string,"workspace_id": string
                  }
                  Update: {
                    "char_end"?: number | null,"char_start"?: number | null,"citation_order"?: number,"created_at"?: string,"exact_quote"?: string,"id"?: string,"knowledge_candidate_id"?: string,"origin_model_run_id"?: string,"source_content_block_id"?: string,"source_snapshot_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_candidate_evidence_block_snapshot_fk"
      columns: ["source_content_block_id","workspace_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "source_content_blocks"
      referencedColumns: ["id","workspace_id","source_snapshot_id"]
    },{
      foreignKeyName: "knowledge_candidate_evidence_candidate_snapshot_fk"
      columns: ["knowledge_candidate_id","workspace_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "knowledge_candidates"
      referencedColumns: ["id","workspace_id","source_snapshot_id"]
    },{
      foreignKeyName: "knowledge_candidate_evidence_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_candidate_evidence_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_candidate_validations": {
                  Row: {
                    "created_at": string,"details": NonNullable<Json>,"id": string,"knowledge_candidate_id": string,"message": string | null,"model_run_id": string | null,"result": string,"severity": string,"validation_round": number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"knowledge_candidate_id": string,"message"?: string | null,"model_run_id"?: string | null,"result": string,"severity": string,"validation_round"?: number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"knowledge_candidate_id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result"?: string,"severity"?: string,"validation_round"?: number,"validator_code"?: string,"validator_type"?: string,"validator_version"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_candidate_validations_candidate_workspace_fk"
      columns: ["knowledge_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "knowledge_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_candidate_validations_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_candidate_validations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_candidates": {
                  Row: {
                    "analysis_id": string,"attributed_to_efeso": boolean,"candidate_fingerprint": string,"candidate_type": string,"canonical_name": string,"created_at": string,"extraction_model_run_id": string,"id": string,"metadata": NonNullable<Json>,"normalized_name": string,"promoted_at": string | null,"promoted_knowledge_object_id": string | null,"proposed_aliases": NonNullable<Json>,"proposed_description": string,"proposed_relations": NonNullable<Json>,"proposed_tags": NonNullable<Json>,"rejection_reason_code": string | null,"rejection_reason_text": string | null,"research_run_id": string,"source_snapshot_id": string,"status": string,"validated_at": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"attributed_to_efeso"?: boolean,"candidate_fingerprint": string,"candidate_type": string,"canonical_name": string,"created_at"?: string,"extraction_model_run_id": string,"id"?: string,"metadata"?: NonNullable<Json>,"normalized_name": string,"promoted_at"?: string | null,"promoted_knowledge_object_id"?: string | null,"proposed_aliases"?: NonNullable<Json>,"proposed_description": string,"proposed_relations"?: NonNullable<Json>,"proposed_tags"?: NonNullable<Json>,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id": string,"source_snapshot_id": string,"status"?: string,"validated_at"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"attributed_to_efeso"?: boolean,"candidate_fingerprint"?: string,"candidate_type"?: string,"canonical_name"?: string,"created_at"?: string,"extraction_model_run_id"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"normalized_name"?: string,"promoted_at"?: string | null,"promoted_knowledge_object_id"?: string | null,"proposed_aliases"?: NonNullable<Json>,"proposed_description"?: string,"proposed_relations"?: NonNullable<Json>,"proposed_tags"?: NonNullable<Json>,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id"?: string,"source_snapshot_id"?: string,"status"?: string,"validated_at"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_candidates_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_candidates_origin_run_scope_fk"
      columns: ["extraction_model_run_id","workspace_id","analysis_id","research_run_id","source_snapshot_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id","analysis_id","research_run_id","source_snapshot_id"]
    },{
      foreignKeyName: "knowledge_candidates_promoted_object_fk"
      columns: ["promoted_knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_candidates_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "knowledge_candidates_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_object_aliases": {
                  Row: {
                    "alias": string,"created_at": string,"id": string,"knowledge_object_id": string,"normalized_alias": string,"source_snapshot_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"created_at"?: string,"id"?: string,"knowledge_object_id": string,"normalized_alias": string,"source_snapshot_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "alias"?: string,"created_at"?: string,"id"?: string,"knowledge_object_id"?: string,"normalized_alias"?: string,"source_snapshot_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_object_aliases_object_workspace_fk"
      columns: ["knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_aliases_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_aliases_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_object_claims": {
                  Row: {
                    "claim_id": string,"created_at": string,"id": string,"knowledge_object_id": string,"relationship_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_id": string,"created_at"?: string,"id"?: string,"knowledge_object_id": string,"relationship_type": string,"workspace_id": string
                  }
                  Update: {
                    "claim_id"?: string,"created_at"?: string,"id"?: string,"knowledge_object_id"?: string,"relationship_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_object_claims_claim_workspace_fk"
      columns: ["claim_id","workspace_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_claims_object_workspace_fk"
      columns: ["knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_claims_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_object_relations": {
                  Row: {
                    "created_at": string,"evidence_fragment_id": string | null,"id": string,"relation_type": string,"source_object_id": string,"source_snapshot_id": string | null,"status": string,"target_object_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence_fragment_id"?: string | null,"id"?: string,"relation_type": string,"source_object_id": string,"source_snapshot_id"?: string | null,"status"?: string,"target_object_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"evidence_fragment_id"?: string | null,"id"?: string,"relation_type"?: string,"source_object_id"?: string,"source_snapshot_id"?: string | null,"status"?: string,"target_object_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_object_relations_fragment_workspace_fk"
      columns: ["evidence_fragment_id","workspace_id"]
isOneToOne: false
      referencedRelation: "evidence_fragments"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_relations_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_relations_source_workspace_fk"
      columns: ["source_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_relations_target_workspace_fk"
      columns: ["target_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_relations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_object_tags": {
                  Row: {
                    "created_at": string,"id": string,"knowledge_object_id": string,"tag_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"knowledge_object_id": string,"tag_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"knowledge_object_id"?: string,"tag_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_object_tags_object_workspace_fk"
      columns: ["knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "knowledge_object_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "knowledge_tags"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_object_tags_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_tag_aliases": {
                  Row: {
                    "alias": string,"created_at": string,"id": string,"normalized_alias": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"created_at"?: string,"id"?: string,"normalized_alias": string,"tag_id": string
                  }
                  Update: {
                    "alias"?: string,"created_at"?: string,"id"?: string,"normalized_alias"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_tag_aliases_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "knowledge_tags"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_tags": {
                  Row: {
                    "canonical_name": string,"category": string,"created_at": string,"id": string,"normalized_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canonical_name": string,"category": string,"created_at"?: string,"id"?: string,"normalized_name": string
                  }
                  Update: {
                    "canonical_name"?: string,"category"?: string,"created_at"?: string,"id"?: string,"normalized_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"model_runs": {
                  Row: {
                    "analysis_id": string,"cached_input_tokens": number | null,"completed_at": string | null,"created_at": string,"error_code": string | null,"error_message": string | null,"id": string,"input_hash": string,"input_manifest": NonNullable<Json>,"input_tokens": number | null,"latency_ms": number | null,"metadata": NonNullable<Json>,"model_name": string,"model_version": string | null,"output_hash": string | null,"output_tokens": number | null,"prompt_version": string,"provider": string,"provider_response_id": string | null,"research_run_id": string,"schema_version": string,"source_snapshot_id": string | null,"started_at": string,"status": string,"task_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"cached_input_tokens"?: number | null,"completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"error_message"?: string | null,"id"?: string,"input_hash": string,"input_manifest"?: NonNullable<Json>,"input_tokens"?: number | null,"latency_ms"?: number | null,"metadata"?: NonNullable<Json>,"model_name": string,"model_version"?: string | null,"output_hash"?: string | null,"output_tokens"?: number | null,"prompt_version": string,"provider": string,"provider_response_id"?: string | null,"research_run_id": string,"schema_version": string,"source_snapshot_id"?: string | null,"started_at"?: string,"status": string,"task_type": string,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"cached_input_tokens"?: number | null,"completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"error_message"?: string | null,"id"?: string,"input_hash"?: string,"input_manifest"?: NonNullable<Json>,"input_tokens"?: number | null,"latency_ms"?: number | null,"metadata"?: NonNullable<Json>,"model_name"?: string,"model_version"?: string | null,"output_hash"?: string | null,"output_tokens"?: number | null,"prompt_version"?: string,"provider"?: string,"provider_response_id"?: string | null,"research_run_id"?: string,"schema_version"?: string,"source_snapshot_id"?: string | null,"started_at"?: string,"status"?: string,"task_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "model_runs_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "model_runs_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "model_runs_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "model_runs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunities": {
                  Row: {
                    "account_intelligence_id": string | null,"assertion_mode": string,"company_id": string,"confidence_tier": string,"created_at": string,"dismissal_reason": string | null,"geography": string | null,"id": string,"maturity": string,"metadata": NonNullable<Json>,"opportunity_type": string,"origin_model_run_id": string | null,"origin_opportunity_candidate_id": string | null,"parent_opportunity_id": string | null,"primary_efeso_fit_id": string | null,"relevance_level": string,"status": string,"summary": string,"supersedes_opportunity_id": string | null,"title": string,"updated_at": string,"urgency_level": string,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_intelligence_id"?: string | null,"assertion_mode": string,"company_id": string,"confidence_tier": string,"created_at"?: string,"dismissal_reason"?: string | null,"geography"?: string | null,"id"?: string,"maturity": string,"metadata"?: NonNullable<Json>,"opportunity_type": string,"origin_model_run_id"?: string | null,"origin_opportunity_candidate_id"?: string | null,"parent_opportunity_id"?: string | null,"primary_efeso_fit_id"?: string | null,"relevance_level": string,"status"?: string,"summary": string,"supersedes_opportunity_id"?: string | null,"title": string,"updated_at"?: string,"urgency_level": string,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "account_intelligence_id"?: string | null,"assertion_mode"?: string,"company_id"?: string,"confidence_tier"?: string,"created_at"?: string,"dismissal_reason"?: string | null,"geography"?: string | null,"id"?: string,"maturity"?: string,"metadata"?: NonNullable<Json>,"opportunity_type"?: string,"origin_model_run_id"?: string | null,"origin_opportunity_candidate_id"?: string | null,"parent_opportunity_id"?: string | null,"primary_efeso_fit_id"?: string | null,"relevance_level"?: string,"status"?: string,"summary"?: string,"supersedes_opportunity_id"?: string | null,"title"?: string,"updated_at"?: string,"urgency_level"?: string,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunities_account_intelligence_fk"
      columns: ["account_intelligence_id"]
isOneToOne: false
      referencedRelation: "account_intelligence"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunities_origin_candidate_fk"
      columns: ["origin_opportunity_candidate_id"]
isOneToOne: false
      referencedRelation: "opportunity_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_origin_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunities_parent_fk"
      columns: ["parent_opportunity_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_primary_fit_fk"
      columns: ["primary_efeso_fit_id"]
isOneToOne: false
      referencedRelation: "efeso_fits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_supersedes_fk"
      columns: ["supersedes_opportunity_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_candidate_validations": {
                  Row: {
                    "created_at": string,"details": NonNullable<Json>,"id": string,"message": string | null,"model_run_id": string | null,"opportunity_candidate_id": string,"result": string,"severity": string,"validation_round": number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"opportunity_candidate_id": string,"result": string,"severity": string,"validation_round"?: number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"opportunity_candidate_id"?: string,"result"?: string,"severity"?: string,"validation_round"?: number,"validator_code"?: string,"validator_type"?: string,"validator_version"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_candidate_validations_candidate_workspace_fk"
      columns: ["opportunity_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunity_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_candidate_validations_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_candidate_validations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_candidates": {
                  Row: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at": string,"generation_model_run_id": string | null,"id": string,"metadata": NonNullable<Json>,"promoted_at": string | null,"promoted_opportunity_id": string | null,"proposed_account_intelligence_id": string | null,"proposed_assertion_mode": string,"proposed_confidence_tier": string,"proposed_fit_links": NonNullable<Json>,"proposed_geography": string | null,"proposed_knowledge_links": NonNullable<Json>,"proposed_maturity": string,"proposed_opportunity_type": string,"proposed_parent_opportunity_id": string | null,"proposed_primary_efeso_fit_id": string | null,"proposed_rationale": string,"proposed_rationale_blocks": NonNullable<Json>,"proposed_relevance_level": string,"proposed_signal_links": NonNullable<Json>,"proposed_summary": string,"proposed_title": string,"proposed_urgency_level": string,"rejection_reason_code": string | null,"rejection_reason_text": string | null,"research_run_id": string,"source_snapshot_id": string | null,"status": string,"validated_at": string | null,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at"?: string,"generation_model_run_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"promoted_at"?: string | null,"promoted_opportunity_id"?: string | null,"proposed_account_intelligence_id"?: string | null,"proposed_assertion_mode": string,"proposed_confidence_tier": string,"proposed_fit_links"?: NonNullable<Json>,"proposed_geography"?: string | null,"proposed_knowledge_links"?: NonNullable<Json>,"proposed_maturity": string,"proposed_opportunity_type": string,"proposed_parent_opportunity_id"?: string | null,"proposed_primary_efeso_fit_id"?: string | null,"proposed_rationale": string,"proposed_rationale_blocks"?: NonNullable<Json>,"proposed_relevance_level": string,"proposed_signal_links"?: NonNullable<Json>,"proposed_summary": string,"proposed_title": string,"proposed_urgency_level": string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id": string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"candidate_fingerprint"?: string,"company_id"?: string,"created_at"?: string,"generation_model_run_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"promoted_at"?: string | null,"promoted_opportunity_id"?: string | null,"proposed_account_intelligence_id"?: string | null,"proposed_assertion_mode"?: string,"proposed_confidence_tier"?: string,"proposed_fit_links"?: NonNullable<Json>,"proposed_geography"?: string | null,"proposed_knowledge_links"?: NonNullable<Json>,"proposed_maturity"?: string,"proposed_opportunity_type"?: string,"proposed_parent_opportunity_id"?: string | null,"proposed_primary_efeso_fit_id"?: string | null,"proposed_rationale"?: string,"proposed_rationale_blocks"?: NonNullable<Json>,"proposed_relevance_level"?: string,"proposed_signal_links"?: NonNullable<Json>,"proposed_summary"?: string,"proposed_title"?: string,"proposed_urgency_level"?: string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id"?: string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_candidates_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_candidates_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_candidates_origin_run_workspace_fk"
      columns: ["generation_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_candidates_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "opportunity_candidates_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_efeso_fits": {
                  Row: {
                    "created_at": string,"efeso_fit_id": string,"id": string,"opportunity_id": string,"relationship_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"efeso_fit_id": string,"id"?: string,"opportunity_id": string,"relationship_type": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"efeso_fit_id"?: string,"id"?: string,"opportunity_id"?: string,"relationship_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_efeso_fits_fit_fk"
      columns: ["efeso_fit_id"]
isOneToOne: false
      referencedRelation: "efeso_fits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_efeso_fits_opportunity_workspace_fk"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_efeso_fits_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_knowledge_objects": {
                  Row: {
                    "created_at": string,"id": string,"knowledge_object_id": string,"opportunity_id": string,"relationship_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"knowledge_object_id": string,"opportunity_id": string,"relationship_type": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"knowledge_object_id"?: string,"opportunity_id"?: string,"relationship_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_knowledge_objects_ko_workspace_fk"
      columns: ["knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_knowledge_objects_opportunity_workspace_fk"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_knowledge_objects_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_rationales": {
                  Row: {
                    "created_at": string,"id": string,"opportunity_id": string,"rationale_type": string,"source_id": string | null,"source_type": string | null,"statement": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"opportunity_id": string,"rationale_type": string,"source_id"?: string | null,"source_type"?: string | null,"statement": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"opportunity_id"?: string,"rationale_type"?: string,"source_id"?: string | null,"source_type"?: string | null,"statement"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_rationales_opportunity_workspace_fk"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_rationales_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_signals": {
                  Row: {
                    "created_at": string,"id": string,"opportunity_id": string,"relationship_type": string,"signal_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"opportunity_id": string,"relationship_type": string,"signal_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"opportunity_id"?: string,"relationship_type"?: string,"signal_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_signals_opportunity_workspace_fk"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_signals_signal_workspace_fk"
      columns: ["signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_signals_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string,"id": string,"job_title": string | null,"preferred_locale": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name": string,"id": string,"job_title"?: string | null,"preferred_locale"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"job_title"?: string | null,"preferred_locale"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recommended_action_candidate_validations": {
                  Row: {
                    "created_at": string,"details": NonNullable<Json>,"id": string,"message": string | null,"model_run_id": string | null,"recommended_action_candidate_id": string,"result": string,"severity": string,"validation_round": number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"recommended_action_candidate_id": string,"result": string,"severity": string,"validation_round"?: number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"recommended_action_candidate_id"?: string,"result"?: string,"severity"?: string,"validation_round"?: number,"validator_code"?: string,"validator_type"?: string,"validator_version"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_action_candidate_validations_candidate_workspace_fk"
      columns: ["recommended_action_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "recommended_action_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_candidate_validations_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_candidate_validations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"recommended_action_candidates": {
                  Row: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at": string,"generation_model_run_id": string | null,"id": string,"metadata": NonNullable<Json>,"opportunity_id": string | null,"promoted_action_id": string | null,"promoted_at": string | null,"proposed_action_type": string,"proposed_confidence_tier": string,"proposed_knowledge_links": NonNullable<Json>,"proposed_opportunity_links": NonNullable<Json>,"proposed_priority": string,"proposed_rationale": string,"proposed_rationale_blocks": NonNullable<Json>,"proposed_relationship_links": NonNullable<Json>,"proposed_title": string,"rejection_reason_code": string | null,"rejection_reason_text": string | null,"research_run_id": string,"status": string,"validated_at": string | null,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at"?: string,"generation_model_run_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opportunity_id"?: string | null,"promoted_action_id"?: string | null,"promoted_at"?: string | null,"proposed_action_type": string,"proposed_confidence_tier": string,"proposed_knowledge_links"?: NonNullable<Json>,"proposed_opportunity_links"?: NonNullable<Json>,"proposed_priority": string,"proposed_rationale": string,"proposed_rationale_blocks"?: NonNullable<Json>,"proposed_relationship_links"?: NonNullable<Json>,"proposed_title": string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id": string,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"candidate_fingerprint"?: string,"company_id"?: string,"created_at"?: string,"generation_model_run_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opportunity_id"?: string | null,"promoted_action_id"?: string | null,"promoted_at"?: string | null,"proposed_action_type"?: string,"proposed_confidence_tier"?: string,"proposed_knowledge_links"?: NonNullable<Json>,"proposed_opportunity_links"?: NonNullable<Json>,"proposed_priority"?: string,"proposed_rationale"?: string,"proposed_rationale_blocks"?: NonNullable<Json>,"proposed_relationship_links"?: NonNullable<Json>,"proposed_title"?: string,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id"?: string,"status"?: string,"validated_at"?: string | null,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_action_candidates_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_candidates_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_candidates_origin_run_workspace_fk"
      columns: ["generation_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_candidates_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"recommended_action_events": {
                  Row: {
                    "action_id": string,"actor_user_id": string | null,"created_at": string,"from_status": string | null,"id": string,"reason": string | null,"to_status": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id": string,"actor_user_id"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: string,"reason"?: string | null,"to_status": string,"workspace_id": string
                  }
                  Update: {
                    "action_id"?: string,"actor_user_id"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: string,"reason"?: string | null,"to_status"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_action_events_action_workspace_fk"
      columns: ["action_id","workspace_id"]
isOneToOne: false
      referencedRelation: "recommended_actions"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_events_actor_user_id_fkey"
      columns: ["actor_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_action_events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"recommended_action_knowledge_objects": {
                  Row: {
                    "action_id": string,"created_at": string,"knowledge_object_id": string,"relationship_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id": string,"created_at"?: string,"knowledge_object_id": string,"relationship_type"?: string,"workspace_id": string
                  }
                  Update: {
                    "action_id"?: string,"created_at"?: string,"knowledge_object_id"?: string,"relationship_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_action_knowledge_action_workspace_fk"
      columns: ["action_id","workspace_id"]
isOneToOne: false
      referencedRelation: "recommended_actions"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_knowledge_object_fk"
      columns: ["knowledge_object_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_action_knowledge_objects_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"recommended_action_opportunities": {
                  Row: {
                    "action_id": string,"created_at": string,"opportunity_id": string,"relationship_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id": string,"created_at"?: string,"opportunity_id": string,"relationship_type": string,"workspace_id": string
                  }
                  Update: {
                    "action_id"?: string,"created_at"?: string,"opportunity_id"?: string,"relationship_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_action_opportunities_action_workspace_fk"
      columns: ["action_id","workspace_id"]
isOneToOne: false
      referencedRelation: "recommended_actions"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_opportunities_opportunity_fk"
      columns: ["opportunity_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_action_opportunities_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"recommended_action_rationales": {
                  Row: {
                    "action_id": string,"created_at": string,"id": string,"rationale_type": string,"source_id": string | null,"source_type": string | null,"statement": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id": string,"created_at"?: string,"id"?: string,"rationale_type": string,"source_id"?: string | null,"source_type"?: string | null,"statement": string,"workspace_id": string
                  }
                  Update: {
                    "action_id"?: string,"created_at"?: string,"id"?: string,"rationale_type"?: string,"source_id"?: string | null,"source_type"?: string | null,"statement"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_action_rationales_action_workspace_fk"
      columns: ["action_id","workspace_id"]
isOneToOne: false
      referencedRelation: "recommended_actions"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_rationales_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"recommended_action_relationships": {
                  Row: {
                    "account_relationship_id": string,"action_id": string,"created_at": string,"relationship_type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_relationship_id": string,"action_id": string,"created_at"?: string,"relationship_type": string,"workspace_id": string
                  }
                  Update: {
                    "account_relationship_id"?: string,"action_id"?: string,"created_at"?: string,"relationship_type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_action_relationships_action_workspace_fk"
      columns: ["action_id","workspace_id"]
isOneToOne: false
      referencedRelation: "recommended_actions"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_action_relationships_rel_fk"
      columns: ["account_relationship_id"]
isOneToOne: false
      referencedRelation: "account_relationships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_action_relationships_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"recommended_actions": {
                  Row: {
                    "action_type": string,"company_id": string,"confidence_tier": string,"created_at": string,"dismissal_reason": string | null,"id": string,"metadata": NonNullable<Json>,"opportunity_id": string | null,"origin_action_candidate_id": string | null,"origin_model_run_id": string | null,"priority": string,"rationale": string,"relationship_context_id": string | null,"status": string,"supersedes_action_id": string | null,"title": string,"updated_at": string,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_type": string,"company_id": string,"confidence_tier": string,"created_at"?: string,"dismissal_reason"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opportunity_id"?: string | null,"origin_action_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"priority": string,"rationale": string,"relationship_context_id"?: string | null,"status"?: string,"supersedes_action_id"?: string | null,"title": string,"updated_at"?: string,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "action_type"?: string,"company_id"?: string,"confidence_tier"?: string,"created_at"?: string,"dismissal_reason"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opportunity_id"?: string | null,"origin_action_candidate_id"?: string | null,"origin_model_run_id"?: string | null,"priority"?: string,"rationale"?: string,"relationship_context_id"?: string | null,"status"?: string,"supersedes_action_id"?: string | null,"title"?: string,"updated_at"?: string,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommended_actions_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_actions_opportunity_fk"
      columns: ["opportunity_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_actions_origin_candidate_fk"
      columns: ["origin_action_candidate_id"]
isOneToOne: false
      referencedRelation: "recommended_action_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_actions_origin_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "recommended_actions_relationship_fk"
      columns: ["relationship_context_id"]
isOneToOne: false
      referencedRelation: "account_relationships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_actions_supersedes_fk"
      columns: ["supersedes_action_id"]
isOneToOne: false
      referencedRelation: "recommended_actions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommended_actions_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"relationship_persons": {
                  Row: {
                    "created_at": string,"display_name": string,"email": string | null,"id": string,"metadata": NonNullable<Json>,"organization": string,"person_type": string,"role_title": string | null,"status": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"email"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"organization": string,"person_type": string,"role_title"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"email"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"organization"?: string,"person_type"?: string,"role_title"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "relationship_persons_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"research_run_sources": {
                  Row: {
                    "created_at": string,"discard_reason": string | null,"discovered_at": string,"discovery_method": string,"disposition": string,"id": string,"ranking_score": number | null,"research_run_id": string,"research_wave": string,"source_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"discard_reason"?: string | null,"discovered_at"?: string,"discovery_method"?: string,"disposition"?: string,"id"?: string,"ranking_score"?: number | null,"research_run_id": string,"research_wave": string,"source_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"discard_reason"?: string | null,"discovered_at"?: string,"discovery_method"?: string,"disposition"?: string,"id"?: string,"ranking_score"?: number | null,"research_run_id"?: string,"research_wave"?: string,"source_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "research_run_sources_run_workspace_fk"
      columns: ["research_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "research_run_sources_source_workspace_fk"
      columns: ["source_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "research_run_sources_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"research_runs": {
                  Row: {
                    "analysis_id": string,"completed_at": string | null,"created_at": string,"current_stage": string | null,"error_code": string | null,"error_message": string | null,"id": string,"objective": string | null,"parent_run_id": string | null,"pipeline_version": string,"progress_percent": number,"requested_by_user_id": string | null,"research_policy_version": string,"run_type": string,"started_at": string | null,"status": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"completed_at"?: string | null,"created_at"?: string,"current_stage"?: string | null,"error_code"?: string | null,"error_message"?: string | null,"id"?: string,"objective"?: string | null,"parent_run_id"?: string | null,"pipeline_version": string,"progress_percent"?: number,"requested_by_user_id"?: string | null,"research_policy_version": string,"run_type"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"completed_at"?: string | null,"created_at"?: string,"current_stage"?: string | null,"error_code"?: string | null,"error_message"?: string | null,"id"?: string,"objective"?: string | null,"parent_run_id"?: string | null,"pipeline_version"?: string,"progress_percent"?: number,"requested_by_user_id"?: string | null,"research_policy_version"?: string,"run_type"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "research_runs_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "research_runs_parent_same_analysis_fk"
      columns: ["parent_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "research_runs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signal_candidate_claims": {
                  Row: {
                    "claim_id": string,"created_at": string,"id": string,"relationship_type": string,"signal_candidate_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_id": string,"created_at"?: string,"id"?: string,"relationship_type": string,"signal_candidate_id": string,"workspace_id": string
                  }
                  Update: {
                    "claim_id"?: string,"created_at"?: string,"id"?: string,"relationship_type"?: string,"signal_candidate_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signal_candidate_claims_candidate_workspace_fk"
      columns: ["signal_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signal_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidate_claims_claim_workspace_fk"
      columns: ["claim_id","workspace_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidate_claims_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signal_candidate_validations": {
                  Row: {
                    "created_at": string,"details": NonNullable<Json>,"id": string,"message": string | null,"model_run_id": string | null,"result": string,"severity": string,"signal_candidate_id": string,"validation_round": number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result": string,"severity": string,"signal_candidate_id": string,"validation_round"?: number,"validator_code": string,"validator_type": string,"validator_version": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"message"?: string | null,"model_run_id"?: string | null,"result"?: string,"severity"?: string,"signal_candidate_id"?: string,"validation_round"?: number,"validator_code"?: string,"validator_type"?: string,"validator_version"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signal_candidate_validations_candidate_workspace_fk"
      columns: ["signal_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signal_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidate_validations_run_workspace_fk"
      columns: ["model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidate_validations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signal_candidates": {
                  Row: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at": string,"extraction_model_run_id": string,"id": string,"metadata": NonNullable<Json>,"promoted_at": string | null,"promoted_signal_id": string | null,"proposed_assertion_mode": string,"proposed_companies": NonNullable<Json>,"proposed_confidence_tier": string | null,"proposed_core_event": string,"proposed_currency_code": string | null,"proposed_effective_period_end": string | null,"proposed_effective_period_start": string | null,"proposed_event_date": string | null,"proposed_geography": string | null,"proposed_importance": string,"proposed_metric_name": string | null,"proposed_numeric_value": number | null,"proposed_parent_signal_id": string | null,"proposed_signal_nature": string,"proposed_signal_type": string,"proposed_summary": string,"proposed_tags": NonNullable<Json>,"proposed_title": string,"proposed_unit": string | null,"rejection_reason_code": string | null,"rejection_reason_text": string | null,"research_run_id": string,"source_snapshot_id": string | null,"status": string,"validated_at": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"candidate_fingerprint": string,"company_id": string,"created_at"?: string,"extraction_model_run_id": string,"id"?: string,"metadata"?: NonNullable<Json>,"promoted_at"?: string | null,"promoted_signal_id"?: string | null,"proposed_assertion_mode"?: string,"proposed_companies"?: NonNullable<Json>,"proposed_confidence_tier"?: string | null,"proposed_core_event": string,"proposed_currency_code"?: string | null,"proposed_effective_period_end"?: string | null,"proposed_effective_period_start"?: string | null,"proposed_event_date"?: string | null,"proposed_geography"?: string | null,"proposed_importance": string,"proposed_metric_name"?: string | null,"proposed_numeric_value"?: number | null,"proposed_parent_signal_id"?: string | null,"proposed_signal_nature": string,"proposed_signal_type": string,"proposed_summary": string,"proposed_tags"?: NonNullable<Json>,"proposed_title": string,"proposed_unit"?: string | null,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id": string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "analysis_id"?: string,"candidate_fingerprint"?: string,"company_id"?: string,"created_at"?: string,"extraction_model_run_id"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"promoted_at"?: string | null,"promoted_signal_id"?: string | null,"proposed_assertion_mode"?: string,"proposed_companies"?: NonNullable<Json>,"proposed_confidence_tier"?: string | null,"proposed_core_event"?: string,"proposed_currency_code"?: string | null,"proposed_effective_period_end"?: string | null,"proposed_effective_period_start"?: string | null,"proposed_event_date"?: string | null,"proposed_geography"?: string | null,"proposed_importance"?: string,"proposed_metric_name"?: string | null,"proposed_numeric_value"?: number | null,"proposed_parent_signal_id"?: string | null,"proposed_signal_nature"?: string,"proposed_signal_type"?: string,"proposed_summary"?: string,"proposed_tags"?: NonNullable<Json>,"proposed_title"?: string,"proposed_unit"?: string | null,"rejection_reason_code"?: string | null,"rejection_reason_text"?: string | null,"research_run_id"?: string,"source_snapshot_id"?: string | null,"status"?: string,"validated_at"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signal_candidates_analysis_workspace_fk"
      columns: ["analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidates_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidates_origin_run_workspace_fk"
      columns: ["extraction_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidates_promoted_signal_fk"
      columns: ["promoted_signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidates_run_analysis_workspace_fk"
      columns: ["research_run_id","analysis_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","analysis_id","workspace_id"]
    },{
      foreignKeyName: "signal_candidates_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_candidates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signal_claims": {
                  Row: {
                    "claim_id": string,"created_at": string,"id": string,"relationship_type": string,"signal_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_id": string,"created_at"?: string,"id"?: string,"relationship_type": string,"signal_id": string,"workspace_id": string
                  }
                  Update: {
                    "claim_id"?: string,"created_at"?: string,"id"?: string,"relationship_type"?: string,"signal_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signal_claims_claim_workspace_fk"
      columns: ["claim_id","workspace_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_claims_signal_workspace_fk"
      columns: ["signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_claims_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signal_companies": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"role": string,"signal_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"role": string,"signal_id": string,"workspace_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"role"?: string,"signal_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signal_companies_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_companies_signal_workspace_fk"
      columns: ["signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_companies_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signal_knowledge_matches": {
                  Row: {
                    "created_at": string,"explanation": string,"id": string,"knowledge_object_id": string,"match_strength": string,"match_type": string,"origin_fit_id": string | null,"signal_id": string,"status": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"explanation": string,"id"?: string,"knowledge_object_id": string,"match_strength": string,"match_type": string,"origin_fit_id"?: string | null,"signal_id": string,"status"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"explanation"?: string,"id"?: string,"knowledge_object_id"?: string,"match_strength"?: string,"match_type"?: string,"origin_fit_id"?: string | null,"signal_id"?: string,"status"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signal_knowledge_matches_fit_workspace_fk"
      columns: ["origin_fit_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_fits"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_knowledge_matches_knowledge_workspace_fk"
      columns: ["knowledge_object_id","workspace_id"]
isOneToOne: false
      referencedRelation: "efeso_knowledge_objects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_knowledge_matches_signal_workspace_fk"
      columns: ["signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_knowledge_matches_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signal_tags": {
                  Row: {
                    "created_at": string,"id": string,"signal_id": string,"tag_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"signal_id": string,"tag_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"signal_id"?: string,"tag_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signal_tags_signal_workspace_fk"
      columns: ["signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signal_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "knowledge_tags"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "signal_tags_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"signals": {
                  Row: {
                    "assertion_mode": string,"company_id": string,"confidence_tier": string,"created_at": string,"currency_code": string | null,"effective_period_end": string | null,"effective_period_start": string | null,"event_date": string | null,"geography": string | null,"id": string,"importance": string,"metadata": NonNullable<Json>,"metric_name": string | null,"numeric_value": number | null,"origin_model_run_id": string | null,"origin_signal_candidate_id": string | null,"parent_signal_id": string | null,"signal_fingerprint": string,"signal_nature": string,"signal_type": string,"source_snapshot_id": string | null,"status": string,"summary": string,"supersedes_signal_id": string | null,"title": string,"unit": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assertion_mode"?: string,"company_id": string,"confidence_tier": string,"created_at"?: string,"currency_code"?: string | null,"effective_period_end"?: string | null,"effective_period_start"?: string | null,"event_date"?: string | null,"geography"?: string | null,"id"?: string,"importance": string,"metadata"?: NonNullable<Json>,"metric_name"?: string | null,"numeric_value"?: number | null,"origin_model_run_id"?: string | null,"origin_signal_candidate_id"?: string | null,"parent_signal_id"?: string | null,"signal_fingerprint": string,"signal_nature": string,"signal_type": string,"source_snapshot_id"?: string | null,"status"?: string,"summary": string,"supersedes_signal_id"?: string | null,"title": string,"unit"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "assertion_mode"?: string,"company_id"?: string,"confidence_tier"?: string,"created_at"?: string,"currency_code"?: string | null,"effective_period_end"?: string | null,"effective_period_start"?: string | null,"event_date"?: string | null,"geography"?: string | null,"id"?: string,"importance"?: string,"metadata"?: NonNullable<Json>,"metric_name"?: string | null,"numeric_value"?: number | null,"origin_model_run_id"?: string | null,"origin_signal_candidate_id"?: string | null,"parent_signal_id"?: string | null,"signal_fingerprint"?: string,"signal_nature"?: string,"signal_type"?: string,"source_snapshot_id"?: string | null,"status"?: string,"summary"?: string,"supersedes_signal_id"?: string | null,"title"?: string,"unit"?: string | null,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signals_company_workspace_fk"
      columns: ["company_id","workspace_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signals_origin_candidate_workspace_fk"
      columns: ["origin_signal_candidate_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signal_candidates"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signals_origin_run_workspace_fk"
      columns: ["origin_model_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "model_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signals_parent_workspace_fk"
      columns: ["parent_signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signals_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signals_supersedes_workspace_fk"
      columns: ["supersedes_signal_id","workspace_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "signals_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"source_content_blocks": {
                  Row: {
                    "block_index": number,"block_type": string,"content_hash": string,"created_at": string,"id": string,"locator": NonNullable<Json>,"metadata": NonNullable<Json>,"page_number": number | null,"parse_confidence": number | null,"parser_name": string,"parser_version": string,"section_title": string | null,"source_snapshot_id": string,"text_content": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_index": number,"block_type": string,"content_hash": string,"created_at"?: string,"id"?: string,"locator"?: NonNullable<Json>,"metadata"?: NonNullable<Json>,"page_number"?: number | null,"parse_confidence"?: number | null,"parser_name": string,"parser_version": string,"section_title"?: string | null,"source_snapshot_id": string,"text_content": string,"workspace_id": string
                  }
                  Update: {
                    "block_index"?: number,"block_type"?: string,"content_hash"?: string,"created_at"?: string,"id"?: string,"locator"?: NonNullable<Json>,"metadata"?: NonNullable<Json>,"page_number"?: number | null,"parse_confidence"?: number | null,"parser_name"?: string,"parser_version"?: string,"section_title"?: string | null,"source_snapshot_id"?: string,"text_content"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "source_content_blocks_snapshot_workspace_fk"
      columns: ["source_snapshot_id","workspace_id"]
isOneToOne: false
      referencedRelation: "source_snapshots"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "source_content_blocks_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"source_snapshots": {
                  Row: {
                    "author": string | null,"captured_at": string,"captured_by_research_run_id": string | null,"content_hash": string,"created_at": string,"id": string,"language_code": string | null,"metadata": NonNullable<Json>,"mime_type": string | null,"normalized_text": string | null,"page_count": number | null,"publication_date": string | null,"snapshot_mode": string,"source_id": string,"storage_key": string | null,"title": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string | null,"captured_at"?: string,"captured_by_research_run_id"?: string | null,"content_hash": string,"created_at"?: string,"id"?: string,"language_code"?: string | null,"metadata"?: NonNullable<Json>,"mime_type"?: string | null,"normalized_text"?: string | null,"page_count"?: number | null,"publication_date"?: string | null,"snapshot_mode": string,"source_id": string,"storage_key"?: string | null,"title"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "author"?: string | null,"captured_at"?: string,"captured_by_research_run_id"?: string | null,"content_hash"?: string,"created_at"?: string,"id"?: string,"language_code"?: string | null,"metadata"?: NonNullable<Json>,"mime_type"?: string | null,"normalized_text"?: string | null,"page_count"?: number | null,"publication_date"?: string | null,"snapshot_mode"?: string,"source_id"?: string,"storage_key"?: string | null,"title"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "source_snapshots_run_workspace_fk"
      columns: ["captured_by_research_run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "research_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "source_snapshots_source_workspace_fk"
      columns: ["source_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "source_snapshots_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"sources": {
                  Row: {
                    "access_type": string,"archived_at": string | null,"canonical_url": string | null,"country_code": string | null,"created_at": string,"domain": string | null,"first_seen_at": string,"id": string,"is_primary_source": boolean,"language_code": string | null,"last_seen_at": string,"publisher_name": string,"source_tier": string,"source_type": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_type"?: string,"archived_at"?: string | null,"canonical_url"?: string | null,"country_code"?: string | null,"created_at"?: string,"domain"?: string | null,"first_seen_at"?: string,"id"?: string,"is_primary_source"?: boolean,"language_code"?: string | null,"last_seen_at"?: string,"publisher_name": string,"source_tier": string,"source_type": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "access_type"?: string,"archived_at"?: string | null,"canonical_url"?: string | null,"country_code"?: string | null,"created_at"?: string,"domain"?: string | null,"first_seen_at"?: string,"id"?: string,"is_primary_source"?: boolean,"language_code"?: string | null,"last_seen_at"?: string,"publisher_name"?: string,"source_tier"?: string,"source_type"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sources_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_authorized_emails": {
                  Row: {
                    "activated_at": string | null,"activated_user_id": string | null,"created_at": string,"email": string,"id": string,"invited_at": string,"role": string,"status": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"activated_user_id"?: string | null,"created_at"?: string,"email": string,"id"?: string,"invited_at"?: string,"role"?: string,"status"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "activated_at"?: string | null,"activated_user_id"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"invited_at"?: string,"role"?: string,"status"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_authorized_emails_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_memberships": {
                  Row: {
                    "created_at": string,"id": string,"joined_at": string,"provisioned_reason": string | null,"role": string,"status": string,"updated_at": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"joined_at"?: string,"provisioned_reason"?: string | null,"role": string,"status"?: string,"updated_at"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"joined_at"?: string,"provisioned_reason"?: string | null,"role"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_memberships_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "country_code": string,"created_at": string,"default_report_locale": string,"default_ui_locale": string,"id": string,"name": string,"slug": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "country_code"?: string,"created_at"?: string,"default_report_locale"?: string,"default_ui_locale"?: string,"id"?: string,"name": string,"slug": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"default_report_locale"?: string,"default_ui_locale"?: string,"id"?: string,"name"?: string,"slug"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "dismiss_opportunity":
{ Args: { "p_opportunity_id": string,"p_reason": string }; Returns: undefined
                           },
"dismiss_recommended_action":
{ Args: { "p_action_id": string,"p_reason": string }; Returns: undefined
                           },
"is_active_workspace_member":
{ Args: { "p_workspace_id": string }; Returns: boolean
                           },
"is_pipeline_service_role":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_workspace_admin":
{ Args: { "p_workspace_id": string }; Returns: boolean
                           },
"knowledge_member_can_read":
{ Args: { "p_approved_display": boolean,"p_commercial": boolean,"p_confidentiality": string,"p_nature": string,"p_visibility": string,"p_workspace_id": string }; Returns: boolean
                           },
"pipeline_actor_uid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"promote_account_intelligence_candidate":
{ Args: { "p_candidate_id": string }; Returns: string
                           },
"promote_claim_candidate":
{ Args: { "p_candidate_id": string }; Returns: string
                           },
"promote_efeso_fit_candidate":
{ Args: { "p_candidate_id": string }; Returns: string
                           },
"promote_knowledge_candidate":
{ Args: { "p_candidate_id": string }; Returns: string
                           },
"promote_opportunity_candidate":
{ Args: { "p_candidate_id": string }; Returns: string
                           },
"promote_recommended_action_candidate":
{ Args: { "p_candidate_id": string }; Returns: string
                           },
"promote_signal_candidate":
{ Args: { "p_candidate_id": string }; Returns: string
                           },
"set_recommended_action_status":
{ Args: { "p_action_id": string,"p_reason": string,"p_status": string }; Returns: undefined
                           },
"storage_workspace_id_from_object_name":
{ Args: { "p_name": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const

/** Convenience aliases. Distinct from frontend/demo intelligence domain types. */
export type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"]
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type WorkspaceMembershipRow = Database["public"]["Tables"]["workspace_memberships"]["Row"]
export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"]
export type CompanyEntityRow = Database["public"]["Tables"]["company_entities"]["Row"]
export type AnalysisRecord = Database["public"]["Tables"]["analyses"]["Row"]
export type ResearchRunRecord = Database["public"]["Tables"]["research_runs"]["Row"]
export type SourceRow = Database["public"]["Tables"]["sources"]["Row"]
export type ResearchRunSourceRow = Database["public"]["Tables"]["research_run_sources"]["Row"]
export type SourceSnapshotRow = Database["public"]["Tables"]["source_snapshots"]["Row"]
export type EvidenceFragmentRow = Database["public"]["Tables"]["evidence_fragments"]["Row"]
export type ClaimRow = Database["public"]["Tables"]["claims"]["Row"]
export type ClaimEvidenceRow = Database["public"]["Tables"]["claim_evidence"]["Row"]
export type SourceContentBlockRow = Database["public"]["Tables"]["source_content_blocks"]["Row"]
export type ModelRunRow = Database["public"]["Tables"]["model_runs"]["Row"]
export type ClaimCandidateRow = Database["public"]["Tables"]["claim_candidates"]["Row"]
export type ClaimCandidateEvidenceRow = Database["public"]["Tables"]["claim_candidate_evidence"]["Row"]
export type ClaimCandidateValidationRow = Database["public"]["Tables"]["claim_candidate_validations"]["Row"]
export type KnowledgeTagRow = Database["public"]["Tables"]["knowledge_tags"]["Row"]
export type KnowledgeCandidateRow = Database["public"]["Tables"]["knowledge_candidates"]["Row"]
export type KnowledgeCandidateEvidenceRow = Database["public"]["Tables"]["knowledge_candidate_evidence"]["Row"]
export type KnowledgeCandidateValidationRow = Database["public"]["Tables"]["knowledge_candidate_validations"]["Row"]
export type EfesoKnowledgeObjectRow = Database["public"]["Tables"]["efeso_knowledge_objects"]["Row"]
export type KnowledgeObjectAliasRow = Database["public"]["Tables"]["knowledge_object_aliases"]["Row"]
export type KnowledgeObjectTagRow = Database["public"]["Tables"]["knowledge_object_tags"]["Row"]
export type KnowledgeObjectClaimRow = Database["public"]["Tables"]["knowledge_object_claims"]["Row"]
export type KnowledgeObjectRelationRow = Database["public"]["Tables"]["knowledge_object_relations"]["Row"]
export type AccessAuditEventRow = Database["public"]["Tables"]["access_audit_events"]["Row"]
