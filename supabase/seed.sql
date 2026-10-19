-- SIGNAL v0.2 Sprint 1 seed — idempotent.
-- Workspace + companies + root entities needed for Company Resolution UX.
-- Does NOT seed claims, evidence, signals, opportunities, capabilities, cases, or reports.
-- Profile / membership for synthetic demo users is created by npm run seed:demo (needs auth.users).

-- EFESO Brazil
INSERT INTO public.workspaces (
  id,
  name,
  slug,
  country_code,
  default_ui_locale,
  default_report_locale,
  status
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'EFESO Brazil',
  'efeso-brazil',
  'BR',
  'pt-BR',
  'pt-BR',
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  country_code = EXCLUDED.country_code,
  default_ui_locale = EXCLUDED.default_ui_locale,
  default_report_locale = EXCLUDED.default_report_locale,
  status = EXCLUDED.status;

-- Companies — metadata copied from src/data/companies.ts (no invented facts).
INSERT INTO public.companies (
  id,
  workspace_id,
  slug,
  display_name,
  primary_domain,
  primary_website_url,
  primary_country_code,
  industry,
  company_type,
  description,
  resolution_status,
  resolved_at
) VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'natura',
    'Natura',
    'natura.com.br',
    'https://natura.com.br',
    'BR',
    'Consumo e Beleza',
    'unknown',
    'Empresa brasileira de cosméticos, fragrâncias e cuidados pessoais, com rede de venda direta e um parque industrial integrado no Brasil.',
    'resolved',
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'vale',
    'Vale',
    'vale.com',
    'https://vale.com',
    'BR',
    'Mineração',
    'unknown',
    'Produtora global de minério de ferro e metais básicos, com sede no Brasil e operações integradas de mina, ferrovia e porto.',
    'resolved',
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'raizen',
    'Raízen',
    'raizen.com.br',
    'https://raizen.com.br',
    'BR',
    'Energia e Agronegócio',
    'unknown',
    'Empresa integrada de bioenergia que produz açúcar, etanol e energia renovável, com distribuição de combustíveis no Brasil e na Argentina.',
    'resolved',
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'umicore',
    'Umicore',
    'umicore.com',
    'https://umicore.com',
    'BE',
    'Materiais avançados',
    'unknown',
    'Grupo de tecnologia de materiais e reciclagem, com produção de catalisadores e materiais especiais, incluindo operações industriais no Brasil.',
    'resolved',
    now()
  )
ON CONFLICT (workspace_id, slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  primary_domain = EXCLUDED.primary_domain,
  primary_website_url = EXCLUDED.primary_website_url,
  primary_country_code = EXCLUDED.primary_country_code,
  industry = EXCLUDED.industry,
  description = EXCLUDED.description,
  resolution_status = EXCLUDED.resolution_status;

-- Root entities for resolution UX (legal name, HQ, parent group from existing mocks).
INSERT INTO public.company_entities (
  id,
  company_id,
  parent_entity_id,
  entity_type,
  display_name,
  legal_name,
  country_code,
  city,
  website_url,
  operational_status
) VALUES
  -- Natura
  (
    'b1000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000000001',
    NULL,
    'group',
    'Natura &Co',
    NULL,
    NULL,
    NULL,
    NULL,
    'active'
  ),
  (
    'b1000000-0000-4000-8000-000000000012',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000011',
    'legal_entity',
    'Natura Cosméticos S.A.',
    'Natura Cosméticos S.A.',
    'BR',
    'São Paulo',
    'https://natura.com.br',
    'active'
  ),
  -- Vale
  (
    'b1000000-0000-4000-8000-000000000021',
    'a1000000-0000-4000-8000-000000000002',
    NULL,
    'legal_entity',
    'Vale S.A.',
    'Vale S.A.',
    'BR',
    'Rio de Janeiro',
    'https://vale.com',
    'active'
  ),
  -- Raízen
  (
    'b1000000-0000-4000-8000-000000000031',
    'a1000000-0000-4000-8000-000000000003',
    NULL,
    'group',
    'Joint venture Cosan / Shell',
    NULL,
    NULL,
    NULL,
    NULL,
    'active'
  ),
  (
    'b1000000-0000-4000-8000-000000000032',
    'a1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000031',
    'legal_entity',
    'Raízen S.A.',
    'Raízen S.A.',
    'BR',
    'São Paulo',
    'https://raizen.com.br',
    'active'
  ),
  -- Umicore
  (
    'b1000000-0000-4000-8000-000000000041',
    'a1000000-0000-4000-8000-000000000004',
    NULL,
    'legal_entity',
    'Umicore N.V.',
    'Umicore N.V.',
    'BE',
    'Bruxelas',
    'https://umicore.com',
    'active'
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  legal_name = EXCLUDED.legal_name,
  country_code = EXCLUDED.country_code,
  city = EXCLUDED.city,
  website_url = EXCLUDED.website_url,
  operational_status = EXCLUDED.operational_status,
  parent_entity_id = EXCLUDED.parent_entity_id;
