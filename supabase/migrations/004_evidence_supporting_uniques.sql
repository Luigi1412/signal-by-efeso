-- Sprint 2 — composite UNIQUE keys required by evidence-chain foreign keys.
-- Do not drop or replace Sprint 1 constraints.

ALTER TABLE public.research_runs
  ADD CONSTRAINT research_runs_id_workspace_unique UNIQUE (id, workspace_id);

ALTER TABLE public.analyses
  ADD CONSTRAINT analyses_id_workspace_company_unique UNIQUE (id, workspace_id, company_id);
