
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "analyses": {
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
                },"companies": {
                  Row: {
                    "archived_at": string | null,"company_type": string,"created_at": string,"description": string | null,"display_name": string,"id": string,"industry": string | null,"primary_country_code": string | null,"primary_domain": string | null,"primary_website_url": string | null,"resolution_status": string,"resolved_at": string | null,"slug": string,"subindustry": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"company_type"?: string,"created_at"?: string,"description"?: string | null,"display_name": string,"id"?: string,"industry"?: string | null,"primary_country_code"?: string | null,"primary_domain"?: string | null,"primary_website_url"?: string | null,"resolution_status"?: string,"resolved_at"?: string | null,"slug": string,"subindustry"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"company_type"?: string,"created_at"?: string,"description"?: string | null,"display_name"?: string,"id"?: string,"industry"?: string | null,"primary_country_code"?: string | null,"primary_domain"?: string | null,"primary_website_url"?: string | null,"resolution_status"?: string,"resolved_at"?: string | null,"slug"?: string,"subindustry"?: string | null,"updated_at"?: string,"workspace_id"?: string
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
                },"workspace_memberships": {
                  Row: {
                    "created_at": string,"id": string,"joined_at": string,"role": string,"status": string,"updated_at": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"joined_at"?: string,"role": string,"status"?: string,"updated_at"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"joined_at"?: string,"role"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string,"workspace_id"?: string
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
            "is_active_workspace_member":
{ Args: { "p_workspace_id": string }; Returns: boolean
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
