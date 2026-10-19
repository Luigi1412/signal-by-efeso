# Backup e restore — Signal v1.0

## O que fazer backup

1. **Banco Postgres / Supabase** — todas as tabelas de domínio (empresas, claims, signals, knowledge, research runs, memberships).
2. **Storage** — bucket `source-files` (uploads de laboratório), se usado.
3. **Knowledge Pack curado** — `data/efeso-knowledge/` no repositório de deploy (não inclui `private/efeso-knowledge-sources/`).
4. **Configuração de ambiente** — valores de produção em um secret store (não no Git).

## O que NÃO fazer backup no repositório

- Secrets (`.env.local`, chaves Tavily/Ollama/Supabase)
- Propostas originais e arquivos em `private/efeso-knowledge-sources/`
- Tokens de sessão

## Backup do banco (exemplo Supabase self-hosted / Postgres)

```bash
pg_dump "$DATABASE_URL" --format=custom --file="signal-$(date +%F).dump"
```

## Restore do banco

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" signal-YYYY-MM-DD.dump
```

Após restore: aplicar migrations pendentes com o fluxo Supabase do projeto e revalidar `npm run release:check` (ou Release Health).

## Storage

Copie o bucket `source-files` com a ferramenta do provedor (Supabase Storage / S3-compatible). Snapshots de pesquisa já vivem no banco (`source_snapshots`).

## Knowledge Pack

O pack curado versionado em `data/efeso-knowledge/` pode ser reimportado:

```bash
npm run check:efeso-knowledge-sources
npm run import:efeso-knowledge -- --dry-run
npm run import:efeso-knowledge
```

Fontes privadas permanecem fora do deploy; só o pack e metadata aprovada entram em produção.

## Secrets

Rotacione chaves no provedor (Supabase, Tavily) e atualize o secret store. Nunca commite secrets.
