# Deployment — Signal v1.0 (self-hosted interno)

Nenhuma URL de produção é declarada aqui até a infraestrutura ser provisionada de fato.

## Requisitos mínimos

- Node.js 20+
- Postgres (Supabase self-hosted ou gerenciado)
- Ollama com modelos de extração/validação/geração
- Chave Tavily
- HTTPS no domínio interno EFESO
- Dois processos: **web** e **research worker**

## Arquitetura

```
Browser (member/admin)
    → Web (Next.js)
    → Postgres + Storage (Supabase)
Research worker → tickExternalCompanyResearch → Tavily + Ollama
Ollama (host ou serviço adjacente)
```

## Variáveis

Use `.env.production.example` como checklist. Fail-closed: `src/server/config/production-env.ts`.

Obrigatórias em produção:

- `NEXT_PUBLIC_SUPABASE_URL` / anon / service role
- `ALLOWED_EMAIL_DOMAINS=efeso.com`
- `TAVILY_API_KEY`
- `LANGUAGE_MODEL_PROVIDER=ollama`
- `OLLAMA_BASE_URL` + modelos
- `RESEARCH_WORKER_ENABLED=true`
- `NEXT_PUBLIC_APP_URL`
- `DEMO_MODE=false`

## Banco e storage

1. Aplicar migrations Supabase (inclui `042_research_worker_lock.sql`).
2. Confirmar RLS.
3. Importar Knowledge Pack curado.
4. Não copiar `private/efeso-knowledge-sources/` para o host de app.

## Ollama

Pode rodar fora do container da aplicação. Ajuste `OLLAMA_BASE_URL` para o host acessível.

## Worker

```bash
npm run worker:research
```

Rode como serviço supervisado (systemd, Compose `worker`, etc.).

## Domínio / HTTPS

Configure o reverse proxy interno (Traefik/Nginx/Caddy) com TLS. Não exponha service role.

## Logs

- Web: stdout do Next.js
- Worker: prefixo `[research-worker …]`
- Não logar secrets, propostas privadas ou trechos sensíveis de knowledge restricted

## Atualização

1. Deploy do artefato `1.0.0+`
2. Migrations
3. Reinício web + worker
4. `npm run release:check` / Release Health
5. Smoke member + admin

## Compose de referência

Ver `docker-compose.v1.yml` (web + worker; Ollama e DB externos ou opcionais).
