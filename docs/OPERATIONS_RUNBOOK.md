# Operations runbook — Signal v1.0

## Processos

| Processo | Comando |
|----------|---------|
| Web | `npm run build && npm run start` |
| Research worker | `npm run worker:research` |
| Ollama | serviço externo (`OLLAMA_BASE_URL`) |
| Database/storage | Supabase / Postgres |

## Iniciar

1. Garantir `.env` de produção com `DEMO_MODE=false`.
2. Subir banco e storage.
3. Garantir Ollama acessível com modelos configurados.
4. `npm run start` (web).
5. `npm run worker:research` (processo separado).

## Saúde

- UI admin: `/admin/release-health`
- CLI: `npm run release:check`

## Reiniciar

- Web: reinicie `npm run start` — runs não dependem do browser.
- Worker: reinicie `npm run worker:research` — retoma runs elegíveis com lock expirado.
- Ollama/Tavily indisponíveis: runs falham de forma recuperável; não duplicam claims por restart (idempotência do tick).

## Runs paradas

1. Release Health → latest research.
2. Research Lab (admin) para inspeção.
3. Worker deve reivindicar runs com `worker_lock_until` expirado.

## Cancelar / reprocessar

Use as actions admin existentes no Research Lab. Não promova candidatos sem evidência.

## Provisionar usuário

```bash
npm run user:provision -- --email pessoa@efeso.com --role member
# ou
npm run user:provision -- --email pessoa@efeso.com --role admin
```

Se invite não estiver disponível, use o dashboard Auth do Supabase e associe membership.

## Atualizar Knowledge Pack

1. Atualizar pack curado (sem commitar fontes privadas).
2. `npm run check:efeso-knowledge-sources`
3. `npm run import:efeso-knowledge -- --dry-run`
4. `npm run import:efeso-knowledge`

## Restore / secrets

Ver `docs/BACKUP_RESTORE.md`. Rotacione secrets no provedor e no secret store do host.
