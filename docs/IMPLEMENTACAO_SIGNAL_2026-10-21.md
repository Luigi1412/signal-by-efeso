# SIGNAL — implementação e validação local

Data: 21/10/2026. Branch preservada: `release/v1.0.0`.
Base: `3f77ec609c7442d6c75c7a7c634c82a947257dc7`.
Fontes: auditoria aprovada `AUDITORIA_SIGNAL_2026-10-21.md`, especificação mestre fornecida na tarefa e blocos de execução aprovados pelo usuário.

**SIGNAL PRODUCT QUALITY GATE FAILED — BLOCKERS REMAIN**

As correções foram implementadas sobre a arquitetura existente. A validação local passou, mas ainda não existe evidência de aprovação ponta a ponta com empresas reais, autenticação Supabase real ou benchmark de inferência. Não há aprovação de produção implícita neste documento.

## Correções realizadas

| Bloco | Implementação |
|---|---|
| 1 — execução e segurança | Ownership por token único em cada fase, slot global de execução pesada, lease de 30 s renovada a cada 3 s, fencing nas gravações PostgREST, liberação ao terminar a fase e cancelamento propagado a downloads/modelos/banco. Browser apenas cria/lê/cancela; não executa o pipeline pesado. Captura com DNS público verificado e conexão fixada aos endereços verificados; valida IPv4, IPv6 e redirects. Streaming limitado em bytes e prazo de corpo inteiro. Cleanup de PDF. RLS verifica allowlist ativa inclusive após revogação. Ativação transacional do primeiro acesso. Magic link fail-closed e callback local seguro. Demo allowlist removida; flags demo são ignoradas em produção, inclusive para provisionamento. Políticas de visibilidade em derivações e fontes privadas. Docker ignora arquivos de ambiente e worker não exige arquivo local de secrets. |
| 2 — fontes | Ranking antes do corte; queries sem anos fixos, horizonte repassado ao provedor, classificação por hostname e semântica do documento, domínios registráveis via Public Suffix List e snapshots com TTL. Navegação oficial descobre hostname de IR e documentos com um salto adicional limitado, antes dos seeds presumidos. Órgãos reguladores e documentos oficiais têm prioridade; agregadores permanecem apoio. |
| 3 — identidade | Preserva consulta original, entidade canônica, marca, parent, subsidiárias, domínio, país corporativo e geografia de pesquisa como conceitos separados. Catálogo permanece auxiliar. Empresas ausentes podem ser resolvidas por busca e metadados públicos de organização no domínio, com evidência registrada e confirmação. Ausência de prova ou ambiguidade não seleciona uma empresa conhecida silenciosamente. |
| 4 — cobertura | Removida a parada no primeiro claim e a geração progressiva duplicada de inteligência. Cobertura considera claims precisos com citação, recência, temas operacionais, fontes primárias, documentos complementares e diversidade. Há orçamento de pesquisa: esgotar o orçamento não implica suficiência. Lacunas ficam registradas. |
| 5 — claims e signals | Preservados valor, unidade, moeda, período, geografia, modalidade e evidência; acrescidos relacionamento de entidade, tema operacional e confiança. Métrica earnings ambígua vai para revisão. Signal exige ao menos dois claims distintos de suporte, movimento operacional recente e fonte primária ou triangulação de publishers reconhecidos. Proposta passa pelo mesmo gate antes da promoção. Histórico, progresso e relatório usam o mesmo assessment de evidência. |
| 6 — Knowledge e Fit | Pack governado de 195 objetos preservado sem alteração. Catálogo de matching filtra objetos e relacionamentos restritos antes de gerar payloads. Pré-seleção determinística limita validações semânticas de Fit. Promoção exige cadeia explícita movimento → implicação operacional → necessidade possível → capability → rationale → incerteza → validação com cliente. Estados distintos de Fit são persistidos. |
| 7 — oportunidades | Somente oportunidades validadas e ligadas aos movimentos qualificados atuais aparecem. Cadeia explicita implicação, necessidade potencial, capability, rationale, incerteza, validação e próximo passo. Texto comercial de fallback e hipóteses rejeitadas não permanecem no relatório. Sem Fit sustentado, a fase não gasta inferência para inventar oportunidade. Zero oportunidades é válido. |
| 8–9 — UX e progresso | Empresas permanece home; navegação de membro continua Empresas/Nova pesquisa/Conta. Rotas antigas de pesquisa simulada redirecionam para o fluxo real. Relatório condicional evita ausências repetidas e seções vazias, exibe referências e trechos citados. Tipos/status têm rótulos PT-BR. Polling de 2 s lê progresso real do worker, inclusive quando a fase não mudou. Contagens de execução não somam indiscriminadamente o histórico da empresa. |
| 10 — performance | Um slot pesado global, buscas concorrentes limitadas a 2, uma inferência por padrão, 2 threads Ollama por padrão, mesmo modelo nas tarefas salvo opção explícita, residência curta, contexto limitado, batching existente preservado e shortlist de até 6 Fits por padrão. Sem movimento qualificado, inteligência/Fit/oportunidades não disparam modelos. Métricas por fase e comando de benchmark de uma empresa implementados. |
| 11–12 — regressões e release | Corrigida a expectativa Klabin desatualizada; testes de SSRF/streaming/cancelamento, identidade genérica, ambiguidade, cobertura, métricas, Fit, datas, TTL, RLS, ownership e privacidade adicionados. Release executa todos os testes unitários, TypeScript, ESLint, migrations/RLS isolados, build e smoke HTTP. Suite de demo é condicional a DEMO_MODE; configuração ausente não pode produzir aprovação de release. |

## Arquitetura final

A máquina de estados persistida continua em `src/server/external-research/orchestrator.ts`.

1. Next.js autentica, aplica acesso EFESO, recebe a consulta e apresenta identidade/progresso/resultado.
2. Supabase conserva workspace, allowlist, entidades, runs, fontes, snapshots imutáveis, evidência, candidatos, validações e promoções transacionais.
3. Worker usa o mesmo orquestrador, adquire um token por fase e o slot global. Heartbeat renova a autorização; triggers rejeitam gravações de tokens antigos.
4. Tavily faz descoberta pública. Captura segura processa HTML e PDF com limites. O código distingue conteúdo observado de resultado de busca.
5. Extração e validação produzem claims rastreáveis. Assessment comum qualifica evidência e signals; completar a execução não significa encontrar movimento.
6. Matching EFESO usa somente catálogo elegível para o membro, shortlist determinística e cadeia semântica validada. Oportunidades e ações dependem de derivações sustentadas.
7. Relatório, histórico e progresso apresentam o resultado epistemológico separadamente do estado operacional.

Não foram introduzidos nova engine de pesquisa, CRM, agentes de vendas ou embeddings. PGlite é dependência **de desenvolvimento**, usada somente para executar PostgreSQL isolado nos testes; não substitui Supabase na aplicação.

## Performance: antes e depois

A comparação abaixo é de código e orçamento padrão, não um benchmark medido de produção.

| Aspecto | Base auditada | Código implementado |
|---|---|---|
| Dono da execução | Browser podia competir com worker | Slot global e token exclusivo por fase |
| Lock | Worker podia esperar a própria lease; renovação fora de chamadas longas | Renovação durante a fase; liberação imediata ao finalizar |
| Buscas/resultados por query | 12 / 8 | 10 / 6 |
| Fontes aceitas/extração inicial | 32 / 8 | 24 / 6 |
| Tentativas de enriquecimento | 18 | 10 |
| Pesquisas concorrentes padrão | 2, sem exclusão global segura | 1 pesada globalmente |
| Parada de extração | Primeiro claim promovido | Cobertura demonstrada ou orçamento esgotado, com lacunas |
| Fit | Validação cara de amplo catálogo | Shortlist fundamentada, até 6 por padrão |
| Modelos residentes | Tarefas podiam escolher modelos distintos | Um modelo compartilhado por padrão; keep_alive 2 min |
| Snapshots | Reutilização sem TTL efetivo | 12 h padrão; configurável 0–168 h; 0 desabilita reuse |
| Downloads | Corpo podia ultrapassar limite/prazo | Streaming, limite por documento e orçamento acumulado; timeout cobre corpo |

Instrumentação: duração por fase; CPU do processo Node; RSS atual e pico amostrado; buscas e retries; URLs descobertas e fetches concluídos; bytes; cache hits; chamadas estruturadas de modelo e retries; extrações; tempo de modelo; tokens e tempos Ollama quando fornecidos. Métricas não registram secrets nem texto EFESO privado.

Limites das métricas: CPU/RSS do Node não equivalem a CPU/RSS do processo Ollama. O benchmark consulta `/api/ps` para modelos residentes e bytes de memória/VRAM; indisponibilidade é registrada, sem estimativa inventada. Chamadas de modelo são chamadas lógicas estruturadas; retries são contados separadamente. Downloads falhos contribuem para bytes, mas `urlsFetched` conta capturas concluídas.

Não existe wall time/CPU/RSS antes/depois de uma pesquisa real neste ambiente. Nenhuma redução percentual de latência ou memória foi demonstrada.

Foi chamado inicialmente **um** benchmark para EssilorLuxottica; o preflight retornou `BLOCKED_EXTERNAL_CONFIGURATION`, com `realRunsStarted: 0`. Não foram disparadas pesquisas simultâneas nem substituídas as fontes por fixtures.

## Segurança

Migrations novas:

- `044`: ownership exclusivo e slot global.
- `045`: allowlist ativa também no RLS, revogação e ativação transacional.
- `046`: contexto de entidade/tema/confiança dos claims.
- `047`: visibilidade de conhecimento nos Fits e derivações comerciais.
- `048`: rationale estruturado de oportunidades.
- `049`: fencing de gravações do pipeline por headers de run/token.
- `050`: fronteira de leitura de fontes/snapshots/blocos/fragmentos/storage privados.
- `051`: heartbeat do worker e inspeção real de integridade de release.

A migration `043` deixou de inserir usuários demo em novas instalações; `045` elimina os registros demo anteriores. Nenhum banco externo recebeu migrations nesta tarefa.

Os testes locais provaram revogação com JWT inalterado; ativação autorizada e recusa de disabled; disputa serializada de ownership, token antigo rejeitado em gravação, renovação, cancelamento e slot entre runs; ocultação de knowledge restrito e de fontes/fragmentos privados. Corrida real entre processos, PostgREST e Auth Supabase ainda precisam de integração no serviço real.

## Pesquisa, evidence e outcomes

Não há fallback de pesquisa normal para a empresa seed/demo. As fontes oficiais descobertas podem fornecer links de IR diferentes do domínio corporativo sem tratá-los como autoridade antes de uma ligação verificável. Identidade genérica não infere sede pelo ccTLD. Metadados insuficientes mantêm a resolução pendente ou exigem confirmação.

Snapshots e fragmentos preservam citação original. Apenas claims com precisão e proveniência entram no assessment. Um signal usa efetivamente os claims citados por ele; um movimento histórico não vira recente apenas porque uma página foi capturada hoje. Uma proposta não passa somente por existir uma notícia, uma linha de signal ou um pipeline concluído.

O gate pode retornar facts-only ou insufficient_evidence honestamente. Falha de provedor continua sendo falha operacional; não é convertida silenciosamente em falta de informação pública.

A regra conservadora de suficiência atual exige pelo menos 3 claims materiais recentes em 2 temas, citando ao menos 2 documentos primários, com diversidade de publishers ou 3 documentos primários do mesmo publisher. Isso é um limite operacional explícito, não uma prova universal de completude. Resultados reais ainda precisam de revisão material; o gate não garante sozinho que nenhuma informação relevante ficou de fora.

## EFESO Knowledge, Fit e oportunidades

O arquivo `data/efeso-knowledge/efeso-knowledge-pack.v1.json` permanece idêntico ao da base, com 195 objetos. Fontes privadas não foram versionadas nem incluídas em payload de membro. O pack ainda precisa ser importado/verificado no Supabase de destino; presença no repositório não comprova importação.

Estados:

- `FIT_NOT_EVALUATED`: sem movimentos qualificados ou avaliação ainda não realizada.
- `NO_RELEVANT_FIT`: catálogo disponível, sem aderência sustentada validada.
- `KNOWLEDGE_UNAVAILABLE`: catálogo/serviço de conhecimento indisponível ou sem objetos elegíveis.
- `FIT_FOUND`: cadeia e aderência promovidas com suporte.

Sem signal não significa ausência de conhecimento EFESO. Sem oportunidade validada não aparece sugestão comercial genérica. Reuso de candidatos deve continuar sujeito à versão de política e aos movimentos suportados no run atual.

## Validação executada

| Check | Resultado |
|---|---|
| Unitários determinísticos | **274 aprovados, 0 falhas, 0 skips** |
| TypeScript e tipos de rotas | Aprovados |
| ESLint, incluindo scripts no release | Aprovado |
| Migrations PostgreSQL isolado | **51 aplicadas integralmente** |
| RLS/ownership/privacidade isolados | Aprovados nos cenários descritos acima |
| Build Next.js | Aprovado |
| Smoke HTTP produtivo | Login 200; home/Empresas protegidas; callback externo contido |
| `git diff --check` | Aprovado |
| Supabase pgTAP completo | Não executado: Docker/Supabase local indisponíveis |
| Navegador visual/autenticado | Não executado: Chromium ausente; download falhou; Auth real sem configuração |
| `npm run release:check` | **Reprovado**: configuração externa ausente e integração Supabase/pgTAP pendente |

Durante uma rodada intermediária o cache persistido do Turbopack apresentou panic. O cache gerado foi descartado e o build completo foi repetido com sucesso; validators e testes não foram relaxados.

O PostgreSQL isolado aplica SQL real, mas serializa conexões e não reproduz todos os serviços Supabase. Seus fixtures relacionais são exclusivos do teste; não constituem validação de pesquisa real.

## Regressões solicitadas

| Caso | Evidência local | Aceitação ponta a ponta |
|---|---|---|
| Embraer | Regras de operação/capacidade, proveniência e signal testadas deterministicamente | Pendente; não foi pesquisada neste ambiente |
| Suzano | Facts-only preservado; resultados financeiros não forçam movimento/fit | Pendente; não foi pesquisada neste ambiente |
| Luxottica/EssilorLuxottica | Relação marca/parent, fontes oficiais, métricas ambíguas e cobertura corrigidas; benchmark bloqueado antes de iniciar | **Não aprovada**; concluir execução não será critério suficiente |
| Empresa fora do catálogo | Teste de identidade por metadados públicos em domínio desconhecido, sem fallback | Pendente com empresa e fontes reais |
| Entidade ambígua | Testes de candidatos e ausência de seleção por geografia apenas | Pendente na UI com usuário real |
| Empresa com pouca informação | Testes de insuficiência: um fato ou muitas páginas fracas não provam suficiência | Pendente com entidade real |
| Klabin | Expectativa desatualizada de resolução corrigida | Teste determinístico aprovado; pesquisa real pendente |

Nenhum desses casos recebeu aprovação de pesquisa real por proxy de build ou de fixture. Não há alegação de relatório Luxottica materialmente aprovado.

## Dependências externas restantes e sequência de aceitação

1. Supabase de teste: URL, anon key, service-role key, workspace real e usuário EFESO explicitamente autorizado. Aplicar migrations e importar/verificar os 195 objetos governados. Configurar Auth/callback e correio real. Não usar conta demo.
2. Tavily: chave real e provedor `tavily`.
3. Ollama: endpoint acessível e modelo instalado; definir `OLLAMA_EXTRACTION_MODEL`. Configuração padrão limita threads, concorrência e troca de modelos, mas sua adequação material precisa de benchmark.
4. Executar worker como processo separado. Verificar heartbeat, RLS/PostgREST, cancelamento durante download/inferência, expiração/reaquisição da lease e disputa entre dois processos.
5. Rodar **um** benchmark real inicialmente: `npm run benchmark:research -- EssilorLuxottica essilorluxottica.com`. Exige `SIGNAL_BENCHMARK_WORKSPACE_ID` e `SIGNAL_BENCHMARK_EMAIL`, além dos serviços reais. Revisar entidade, fontes primárias, datas, claims, cobertura, signals, Fit, relatório e métricas; corrigir qualquer falha antes de ampliar.
6. Depois executar os casos restantes sequencialmente, sem exigir signals de todos. Comparar baseline equivalente quando disponível; não repetir inferências pesadas em massa.
7. Executar pgTAP no Supabase e browser com login real, member/admin/disabled, ambiguidade, nova empresa, progresso, cancelamento e relatório vertical. Rodar novamente `npm run release:check`.

`ALLOWED_EMAIL_DOMAINS=efeso.com`, flags de demo desligadas e budgets estão documentados nos exemplos. Esses valores simples são configuração de instalação, não credenciais a serem inventadas. O runtime de browser/Docker ausente aqui limita testes locais, sem justificar nova engine ou alteração de infraestrutura do produto.

A falta de serviços impede demonstrar se ainda surgirão defeitos internos sob inferência real. A lista acima é uma sequência de verificação e **não** uma certificação de que basta preencher credenciais para obter qualidade de produto.

## Arquivos, commits e publicação

O inventário completo está em `ARQUIVOS_ALTERADOS_SIGNAL_2026-10-21.txt`. A evidência resumida dos checks está em `VALIDACAO_LOCAL_SIGNAL_2026-10-21.txt`.

Não houve push, merge em main, criação de tag ou deploy. Nenhum commit local foi criado: as alterações estão na árvore de trabalho, sobre o HEAD informado. A aplicação existente e o pack governado foram preservados.

**Veredito final: SIGNAL PRODUCT QUALITY GATE FAILED — BLOCKERS REMAIN.**
