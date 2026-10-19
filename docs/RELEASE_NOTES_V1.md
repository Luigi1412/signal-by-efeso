# Signal v1.0.0 — Release Notes

## Scope freeze

Signal v1.0 congela o escopo de produto. Não entram novas engines, CRM, LinkedIn, e-mail, agentes, embeddings, pgvector, automações externas, analytics fictício ou scores mágicos.

Mudanças após este ponto: simplificação, correção, segurança, operação, performance ou release.

## O que entrega

- Pesquisa externa real (Tavily) com worker independente do browser (`npm run worker:research`)
- Modelo local via Ollama (`LANGUAGE_MODEL_PROVIDER=ollama`)
- Claims, Signals, Account Intelligence, EFESO Fit, Opportunities, Relationship Intelligence e Recommended Actions
- Knowledge Pack curado EFESO (195 objetos) com governança e RLS
- Navegação member: Início · Empresas · Expertise EFESO
- Workspace da empresa: Resumo · Oportunidades · Próximos passos · Fontes
- Outcomes honestos (`facts_only`, `insufficient_evidence`, etc.)
- `DEMO_MODE=false` obrigatório em produção
- Empacotamento self-hosted documentado

## Caso negativo reconhecido

Suzano permanece como caso válido de facts-only: fontes e claims reais, sem sinal inventado.

## Compatibilidade

Rotas antigas (`/radar`, `/signals`, `/actions`, `/opportunities`, `/knowledge/efeso`) redirecionam para a superfície final.

## Versão

`1.0.0`
