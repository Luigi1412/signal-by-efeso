# SIGNAL by EFESO

Inteligência de empresas baseada em evidências, para a EFESO Brasil.

**Versão: 1.0.0** — ver `docs/RELEASE_NOTES_V1.md`.

## Produto real no Mac

Comece em [docs/REAL_LOCAL.md](docs/REAL_LOCAL.md). Esse é o fluxo principal: Auth/Supabase, usuários explicitamente autorizados, Tavily, modelo e worker reais.

```bash
npm ci
npm run setup:local
# Preencha credenciais somente no .env.local privado.
# Vincule o projeto, aplique migrations sem reset e autorize os usuários conforme o guia.
npm run check:real
npm run app:local
```

Abra **http://127.0.0.1:3000/companies** no mesmo computador. `app:local` inicia app + worker e recusa configuração incompleta; não inicia pesquisas automaticamente.

O domínio EFESO sozinho não concede acesso. Endereços externos exigem aprovação individual explícita na allowlist. Não há senha predefinida nem login demo na tela de entrada.

Sem infraestrutura real, o produto fica **BLOCKED**. Testes locais e preview não constituem aprovação de go-live.

## QA interno

`npm run preview:local` usa exclusivamente cenários fictícios em memória e é opt-in para desenvolvimento. Não é o produto apresentado, não usa Auth real nem persiste pesquisa. O modo real e o seed padrão não carregam fixtures. Não execute `seed:demo` para inicializar o produto real.

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
