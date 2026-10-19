-- Sprint 10.6 — governed EFESO knowledge: visibility, nature, outcome, RLS.

ALTER TABLE public.knowledge_tags
  DROP CONSTRAINT knowledge_tags_category_check;

ALTER TABLE public.knowledge_tags
  ADD CONSTRAINT knowledge_tags_category_check CHECK (category IN (
    'INDUSTRY',
    'CAPABILITY_DOMAIN',
    'BUSINESS_PROBLEM',
    'GEOGRAPHY',
    'SERVICE_FAMILY',
    'METHODOLOGY',
    'TRANSFORMATION_DIMENSION',
    'ENGAGEMENT_STAGE',
    'SUBSEGMENT'
  ));

ALTER TABLE public.efeso_knowledge_objects
  ADD COLUMN IF NOT EXISTS stable_key text,
  ADD COLUMN IF NOT EXISTS visibility_level text NOT NULL DEFAULT 'efeso_member',
  ADD COLUMN IF NOT EXISTS confidentiality_level text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS knowledge_nature text NOT NULL DEFAULT 'institutional_fact',
  ADD COLUMN IF NOT EXISTS outcome_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS source_document_type text,
  ADD COLUMN IF NOT EXISTS client_attribution text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS approved_for_matching boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_for_display boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS commercial_terms_present boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date;

ALTER TABLE public.efeso_knowledge_objects
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_visibility_check,
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_confidentiality_check,
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_nature_check,
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_outcome_check,
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_source_document_type_check,
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_attribution_check,
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_effective_range_check,
  DROP CONSTRAINT IF EXISTS efeso_knowledge_objects_nature_outcome_check;

ALTER TABLE public.efeso_knowledge_objects
  ADD CONSTRAINT efeso_knowledge_objects_visibility_check CHECK (visibility_level IN (
    'public', 'efeso_member', 'restricted_account_team', 'admin_only'
  )),
  ADD CONSTRAINT efeso_knowledge_objects_confidentiality_check CHECK (confidentiality_level IN (
    'public', 'internal', 'confidential', 'highly_confidential'
  )),
  ADD CONSTRAINT efeso_knowledge_objects_nature_check CHECK (knowledge_nature IN (
    'institutional_fact',
    'reusable_methodology',
    'client_reported_need',
    'diagnostic_finding',
    'proposed_scope',
    'expected_benefit',
    'historical_benchmark',
    'delivered_result',
    'client_testimonial',
    'commercial_claim'
  )),
  ADD CONSTRAINT efeso_knowledge_objects_outcome_check CHECK (outcome_status IN (
    'not_applicable',
    'proposed',
    'expected',
    'potential',
    'estimated',
    'benchmark',
    'delivered',
    'client_reported',
    'independently_verified'
  )),
  ADD CONSTRAINT efeso_knowledge_objects_source_document_type_check CHECK (
    source_document_type IS NULL OR source_document_type IN (
      'official_website',
      'institutional_deck',
      'public_case',
      'commercial_proposal',
      'prime_twin_report',
      'internal_email',
      'internal_case_material',
      'canonical_taxonomy'
    )
  ),
  ADD CONSTRAINT efeso_knowledge_objects_attribution_check CHECK (client_attribution IN (
    'none', 'named', 'anonymized'
  )),
  ADD CONSTRAINT efeso_knowledge_objects_effective_range_check CHECK (
    effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from
  ),
  ADD CONSTRAINT efeso_knowledge_objects_nature_outcome_check CHECK (
    NOT (knowledge_nature = 'proposed_scope' AND outcome_status IN ('delivered', 'independently_verified'))
    AND NOT (knowledge_nature = 'expected_benefit' AND outcome_status IN ('delivered', 'independently_verified'))
    AND NOT (knowledge_nature = 'historical_benchmark' AND outcome_status = 'delivered')
    AND NOT (knowledge_nature = 'commercial_claim' AND outcome_status IN ('delivered', 'independently_verified'))
  );

CREATE UNIQUE INDEX IF NOT EXISTS efeso_knowledge_objects_workspace_stable_key_active_uidx
  ON public.efeso_knowledge_objects (workspace_id, stable_key)
  WHERE stable_key IS NOT NULL AND status <> 'archived';

CREATE OR REPLACE FUNCTION public.knowledge_member_can_read(
  p_workspace_id uuid,
  p_visibility text,
  p_confidentiality text,
  p_approved_display boolean,
  p_commercial boolean,
  p_nature text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.is_active_workspace_member(p_workspace_id)
    AND (
      public.is_workspace_admin(p_workspace_id)
      OR (
        p_approved_display
        AND p_commercial = false
        AND p_visibility IN ('public', 'efeso_member')
        AND p_confidentiality IN ('public', 'internal')
        AND p_nature NOT IN ('client_reported_need', 'commercial_claim')
      )
    );
$$;

REVOKE ALL ON FUNCTION public.knowledge_member_can_read(uuid, text, text, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.knowledge_member_can_read(uuid, text, text, boolean, boolean, text) TO authenticated;

DROP POLICY IF EXISTS efeso_knowledge_objects_select_member ON public.efeso_knowledge_objects;
CREATE POLICY efeso_knowledge_objects_select_member
  ON public.efeso_knowledge_objects FOR SELECT TO authenticated
  USING (
    public.knowledge_member_can_read(
      workspace_id,
      visibility_level,
      confidentiality_level,
      approved_for_display,
      commercial_terms_present,
      knowledge_nature
    )
  );

DROP POLICY IF EXISTS knowledge_object_aliases_select_member ON public.knowledge_object_aliases;
CREATE POLICY knowledge_object_aliases_select_member
  ON public.knowledge_object_aliases FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.efeso_knowledge_objects o
      WHERE o.id = knowledge_object_id
        AND o.workspace_id = knowledge_object_aliases.workspace_id
        AND public.knowledge_member_can_read(
          o.workspace_id,
          o.visibility_level,
          o.confidentiality_level,
          o.approved_for_display,
          o.commercial_terms_present,
          o.knowledge_nature
        )
    )
  );

DROP POLICY IF EXISTS knowledge_object_tags_select_member ON public.knowledge_object_tags;
CREATE POLICY knowledge_object_tags_select_member
  ON public.knowledge_object_tags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.efeso_knowledge_objects o
      WHERE o.id = knowledge_object_id
        AND o.workspace_id = knowledge_object_tags.workspace_id
        AND public.knowledge_member_can_read(
          o.workspace_id,
          o.visibility_level,
          o.confidentiality_level,
          o.approved_for_display,
          o.commercial_terms_present,
          o.knowledge_nature
        )
    )
  );

DROP POLICY IF EXISTS knowledge_object_claims_select_member ON public.knowledge_object_claims;
CREATE POLICY knowledge_object_claims_select_member
  ON public.knowledge_object_claims FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.efeso_knowledge_objects o
      WHERE o.id = knowledge_object_id
        AND o.workspace_id = knowledge_object_claims.workspace_id
        AND public.knowledge_member_can_read(
          o.workspace_id,
          o.visibility_level,
          o.confidentiality_level,
          o.approved_for_display,
          o.commercial_terms_present,
          o.knowledge_nature
        )
    )
  );

DROP POLICY IF EXISTS knowledge_object_relations_select_member ON public.knowledge_object_relations;
CREATE POLICY knowledge_object_relations_select_member
  ON public.knowledge_object_relations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.efeso_knowledge_objects o
      WHERE o.id = source_object_id
        AND o.workspace_id = knowledge_object_relations.workspace_id
        AND public.knowledge_member_can_read(
          o.workspace_id,
          o.visibility_level,
          o.confidentiality_level,
          o.approved_for_display,
          o.commercial_terms_present,
          o.knowledge_nature
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.efeso_knowledge_objects t
      WHERE t.id = target_object_id
        AND t.workspace_id = knowledge_object_relations.workspace_id
        AND public.knowledge_member_can_read(
          t.workspace_id,
          t.visibility_level,
          t.confidentiality_level,
          t.approved_for_display,
          t.commercial_terms_present,
          t.knowledge_nature
        )
    )
  );

UPDATE public.knowledge_tags
SET canonical_name = 'Food and Beverage'
WHERE category = 'INDUSTRY' AND normalized_name = 'food and beverage';

INSERT INTO public.knowledge_tags (category, canonical_name, normalized_name)
VALUES
  ('INDUSTRY', 'Aerospace & Defense', 'aerospace and defense'),
  ('INDUSTRY', 'Automotive and Commercial Vehicles', 'automotive and commercial vehicles'),
  ('INDUSTRY', 'Consumer Goods and Luxury', 'consumer goods and luxury'),
  ('INDUSTRY', 'Industrial Manufacturing', 'industrial manufacturing'),
  ('INDUSTRY', 'Mining, Metals and Minerals', 'mining metals and minerals'),
  ('INDUSTRY', 'Oil & Gas and Sustainable Energy', 'oil and gas and sustainable energy'),
  ('INDUSTRY', 'Private Equity', 'private equity'),
  ('INDUSTRY', 'Transportation, Logistics and Services', 'transportation logistics and services'),
  ('SERVICE_FAMILY', 'Operations Strategy and Transformation', 'operations strategy and transformation'),
  ('SERVICE_FAMILY', 'Transactions and Turnaround', 'transactions and turnaround'),
  ('SERVICE_FAMILY', 'R&D and Product Profitability', 'r and d and product profitability'),
  ('SERVICE_FAMILY', 'Cost and Value Engineering', 'cost and value engineering'),
  ('SERVICE_FAMILY', 'Manufacturing', 'manufacturing'),
  ('SERVICE_FAMILY', 'Procurement', 'procurement'),
  ('SERVICE_FAMILY', 'Supply Chain', 'supply chain'),
  ('SERVICE_FAMILY', 'Digital & AI', 'digital and ai'),
  ('SERVICE_FAMILY', 'Sustainability', 'sustainability'),
  ('SERVICE_FAMILY', 'People and Organization', 'people and organization'),
  ('SERVICE_FAMILY', 'Lean Lab', 'lean lab'),
  ('SERVICE_FAMILY', 'Sales & Operations Planning', 'sales and operations planning'),
  ('TRANSFORMATION_DIMENSION', 'Process', 'process'),
  ('TRANSFORMATION_DIMENSION', 'Human', 'human'),
  ('TRANSFORMATION_DIMENSION', 'Digital', 'digital'),
  ('TRANSFORMATION_DIMENSION', 'Sustainability', 'sustainability'),
  ('ENGAGEMENT_STAGE', 'Assess', 'assess'),
  ('ENGAGEMENT_STAGE', 'Design', 'design'),
  ('ENGAGEMENT_STAGE', 'Implement', 'implement'),
  ('ENGAGEMENT_STAGE', 'Sustain', 'sustain'),
  ('ENGAGEMENT_STAGE', 'Scale', 'scale'),
  ('ENGAGEMENT_STAGE', 'Academy / Capability Building', 'academy capability building'),
  ('SUBSEGMENT', 'Pharma', 'pharma'),
  ('SUBSEGMENT', 'MedTech', 'medtech'),
  ('SUBSEGMENT', 'Cosmetics', 'cosmetics'),
  ('SUBSEGMENT', 'Battery', 'battery'),
  ('SUBSEGMENT', 'Building Materials', 'building materials'),
  ('SUBSEGMENT', 'Bioenergy', 'bioenergy'),
  ('SUBSEGMENT', 'Pulp and Paper', 'pulp and paper'),
  ('SUBSEGMENT', 'Agribusiness', 'agribusiness'),
  ('BUSINESS_PROBLEM', 'low productivity', 'low productivity'),
  ('BUSINESS_PROBLEM', 'capacity constraint', 'capacity constraint'),
  ('BUSINESS_PROBLEM', 'ramp-up risk', 'ramp up risk'),
  ('BUSINESS_PROBLEM', 'low OEE', 'low oee'),
  ('BUSINESS_PROBLEM', 'asset reliability loss', 'asset reliability loss'),
  ('BUSINESS_PROBLEM', 'unplanned downtime', 'unplanned downtime'),
  ('BUSINESS_PROBLEM', 'excessive setup', 'excessive setup'),
  ('BUSINESS_PROBLEM', 'defects and rework', 'defects and rework'),
  ('BUSINESS_PROBLEM', 'weak daily management', 'weak daily management'),
  ('BUSINESS_PROBLEM', 'fragmented KPIs', 'fragmented kpis'),
  ('BUSINESS_PROBLEM', 'recurring unresolved problems', 'recurring unresolved problems'),
  ('BUSINESS_PROBLEM', 'low continuous-improvement maturity', 'low continuous improvement maturity'),
  ('BUSINESS_PROBLEM', 'late decisions', 'late decisions'),
  ('BUSINESS_PROBLEM', 'disconnected planning', 'disconnected planning'),
  ('BUSINESS_PROBLEM', 'materials shortage', 'materials shortage'),
  ('BUSINESS_PROBLEM', 'excess inventory', 'excess inventory'),
  ('BUSINESS_PROBLEM', 'obsolescence', 'obsolescence'),
  ('BUSINESS_PROBLEM', 'supply risk', 'supply risk'),
  ('BUSINESS_PROBLEM', 'high working capital', 'high working capital'),
  ('BUSINESS_PROBLEM', 'warehouse capacity gap', 'warehouse capacity gap'),
  ('BUSINESS_PROBLEM', 'inefficient layout', 'inefficient layout'),
  ('BUSINESS_PROBLEM', 'order-cycle delays', 'order cycle delays'),
  ('BUSINESS_PROBLEM', 'low service level', 'low service level'),
  ('BUSINESS_PROBLEM', 'spare-parts slow moving', 'spare parts slow moving'),
  ('BUSINESS_PROBLEM', 'procurement cost pressure', 'procurement cost pressure'),
  ('BUSINESS_PROBLEM', 'supplier risk', 'supplier risk'),
  ('BUSINESS_PROBLEM', 'cost leakage', 'cost leakage'),
  ('BUSINESS_PROBLEM', 'digital initiatives without operational integration', 'digital initiatives without operational integration'),
  ('BUSINESS_PROBLEM', 'sustainability execution gap', 'sustainability execution gap'),
  ('BUSINESS_PROBLEM', 'organization and change gap', 'organization and change gap')
ON CONFLICT (category, normalized_name) DO NOTHING;
