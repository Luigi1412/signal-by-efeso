# SIGNAL by EFESO

Inteligência de empresas baseada em evidências, para a EFESO Brasil.

Frontend prototype **v0.1.1** is frozen. This tree includes **v0.2 Sprint 1** — persistence foundation (PostgreSQL + Supabase Auth + RLS). The research engine, LLMs, and intelligence tables are not in this sprint.

## Local setup

Prerequisites: Node 20+ and **Docker Desktop** (or Podman) on `PATH`. The Supabase CLI cannot start the local stack without a container engine. Postgres.app alone is not enough — Signal needs Supabase Auth (`auth.users`) and RLS.

```bash
cd signal
cp .env.example .env.local
npm install
npm run supabase:start
npm run supabase:reset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Login CTA **Continuar com conta EFESO** (when `DEMO_AUTH_MODE=true`) creates a real Supabase Auth session for `mariana@efeso.demo` and bootstraps profile + EFESO Brazil membership.

### Environment

See `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Do not prefix it with `NEXT_PUBLIC_`.

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (demo bootstrap) |
| `DEMO_AUTH_MODE` | Server only |
| `DEMO_AUTH_PASSWORD` | Server only |

### Useful commands

```bash
npm run supabase:start    # local API http://127.0.0.1:54321
npm run supabase:stop
npm run supabase:reset    # migrations + seed.sql
npm run supabase:types    # regenerate src/types/database.ts
npm run test:rls          # pgTAP cross-workspace smoke test
npm run typecheck
npm run lint
npm run build
```

Studio (after `supabase:start`): [http://127.0.0.1:54323](http://127.0.0.1:54323)

If Docker is not installed, `npm run supabase:start` fails. The Next.js UI still runs against mock intelligence, but analysis persistence and demo login require the local stack.

### RLS test

Requires local Supabase to be running (`npm run supabase:start`). Then:

```bash
npm run test:rls
```

The test lives at `supabase/tests/rls_workspace_isolation.sql`. It creates a synthetic Workspace B inside a rolled-back transaction and asserts that User A (EFESO Brazil) cannot read it.

## What is persisted vs mock

Persisted: workspace, profile, membership, companies, analyses, research runs (including fake research progress).

Still mock: Natura opportunities, evidence, signals, report, versions, capabilities, conflicts.
