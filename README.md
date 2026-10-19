# SIGNAL by EFESO

Inteligência de empresas baseada em evidências, para a EFESO Brasil.

**Versão: 1.0.0** — ver `docs/RELEASE_NOTES_V1.md`.

## Local setup

Prerequisites: Node 20+ e Docker (Supabase local).

```bash
cd signal
cp .env.development.example .env.local
# preencha chaves locais
npm install
npm run supabase:start
npm run supabase:reset
npm run import:efeso-knowledge
npm run seed:demo   # somente development / DEMO_MODE=true
npm run dev
```

Em outro terminal (pesquisa independente do browser):

```bash
npm run worker:research
```

Open [http://localhost:3000](http://localhost:3000).

Acesso restrito a `@efeso.com`. Em development com `DEMO_MODE=true` e `DEMO_AUTH_MODE=true`, botões demo provisionam contas sintéticas. Em produção: `DEMO_MODE=false`.

## Produção / self-hosted

- Checklist de env: `.env.production.example`
- Deploy: `docs/DEPLOYMENT_V1.md`
- Operação: `docs/OPERATIONS_RUNBOOK.md`
- Backup: `docs/BACKUP_RESTORE.md`
- Compose de referência: `docker-compose.v1.yml`

```bash
npm run build
npm run start
npm run worker:research
npm run release:check
```

## Segurança

- Não committe `.env.local` nem `private/efeso-knowledge-sources/`
- Deploy usa apenas Knowledge Pack curado + metadata aprovada
- OpenAI permanece optional / not funded

## Navegação member (v1.0)

Início · Empresas · Expertise EFESO

Workspace da empresa: Resumo · Oportunidades · Próximos passos · Fontes
