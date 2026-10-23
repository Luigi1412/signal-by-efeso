# SIGNAL — auditoria de continuidade

Data: 21/10/2026. Branch: `release/v1.0.0`.
Commit auditado: `3f77ec609c7442d6c75c7a7c634c82a947257dc7`.

## Conclusão

O repositório contém uma aplicação substancial que deve ser corrigida incrementalmente. Não há justificativa para reconstrução. Entretanto, testes unitários e build verdes ainda não comprovam qualidade de pesquisa, segurança de todas as superfícies ou operação ponta a ponta.

**SIGNAL PRODUCT QUALITY GATE FAILED — BLOCKERS REMAIN**

Esse veredito identifica bloqueios de código e validações pendentes; não significa que uma nova pesquisa real tenha sido executada e reprovada nesta auditoria.

## Escopo e limites da evidência

- Especificação anexa lida integralmente, incluindo critérios finais e entregáveis.
- Clone da branch existente; HEAD local e referência remota conferidos. Árvore inicialmente limpa.
- Inventário transversal de 458 arquivos em `src`, 43 migrations, testes, scripts, dados, documentação e configuração de entrega. Leitura dos caminhos centrais e suas dependências: identidade, descoberta, classificação, ingestão, extração, validação, promoção, sinais, inteligência, Fit, oportunidades, apresentação, acesso e worker.
- Histórico recente inspecionado. O commit `7f692e3` já implementa parte das correções descritas no handoff; o HEAD seguinte corrige inicialização CLI de `server-only`.
- Não houve alteração de código funcional, migration, teste, dependência declarada ou configuração. Apenas este diagnóstico foi acrescentado; dependências e tipos gerados foram preparados localmente para verificação.
- Nenhuma pesquisa pesada, inferência local real, push, merge, tag ou deploy.
- Supabase, Tavily e Ollama não estão configurados neste ambiente. Sem acesso ao banco dos runs históricos, os números de Embraer/Suzano/Luxottica permanecem evidência histórica relatada, não resultados revalidados.
- Auditoria estática e testes locais não substituem testes SQL/RLS, corrida entre processos, browser autenticado e benchmark real.

## Mapa da arquitetura existente

| Camada | Implementação | Papel |
|---|---|---|
| Interface | Next.js 16.4 / React 19.3, `src/app`, `src/components` | Login, Empresas, nova pesquisa, progresso, relatório, conta e administração |
| Acesso | `server/access`, `session.ts`, actions, Supabase Auth | Domínio permitido, allowlist, membership, papéis e primeiro acesso |
| Pesquisa | `external-research/orchestrator.ts` | Máquina de estados persistida de identidade até ações e conclusão |
| Identidade | `entity.ts`, `catalog.ts`, confirmação na UI | Workspace + catálogo estático + domínio confirmado manualmente |
| Descoberta | `queries.ts`, `discover.ts`, `tavily-provider.ts` | Busca Tavily e URLs oficiais presumidas |
| Seleção | `quality.ts`, `priority.ts`, `dedup.ts`, `tavily-map.ts` | Relevância, autoridade, tipo, ordenação e deduplicação |
| Captura | `http-provider.ts`, `fetch-safe.ts`, `ingest.ts`, parsers | HTML/PDF, snapshots, blocos e hashes |
| Claims | `controlled-intelligence-extraction-service.ts`, `extraction/*` | Janelas, extração, citação exata, validação determinística e semântica |
| Sinais e inteligência | `signal-extraction-service.ts`, `intelligence/*` | Movimentos fundamentados, temas e leitura da conta |
| Conhecimento EFESO | `data/efeso-knowledge`, `knowledge/*` | Pack curado, importação, taxonomia e governança |
| Fit e oportunidades | `efeso-fit-service.ts`, `opportunity-extraction-service.ts` | Derivação taxonômica, validação semântica e promoção |
| Apresentação | `company-briefing-service.ts`, `company-report.tsx`, `product/*` | Outcome, relatório, hipóteses, limitações e estado de Fit |
| Persistência | Supabase/Postgres, repositories e módulos `persistence.ts` | RLS, integridade, versões e RPCs de promoção atômica |
| Execução | `scripts/research-worker.ts` + ticks por Server Action | Dois caminhos executores sobre a mesma máquina de estados |
| Entrega | Dockerfile/Compose, Release Health, `release-check.ts` | Build, verificações e alvo self-hosted |

Há dois registros de execução relacionados: `external_research_runs` e o registro legado `research_runs`. Não remover um deles sem mapear as referências de análises, snapshots e model runs.

## PRESERVAR

1. Aplicação, esquema, histórico e fluxo persistido existentes. A navegação principal já é **Empresas · Nova pesquisa · Conta**, com administração condicional.
2. Fundação de evidências: snapshots, content blocks, citações exatas, hashes, manifests de model runs, validações e promoção atômica no banco. É a parte mais valiosa da implementação.
3. Separação entre claims, sinais, interpretações e oportunidades. Política conservadora de claims exige grounding direto e mantém avisos relevantes em revisão.
4. Providers desacoplados. Ollama já é o caminho padrão; OpenAI permanece opcional. Não introduzir nova dependência de API paga.
5. Pack real: **195 objetos**, sendo 12 services, 32 capabilities, 27 methodologies, 70 concepts, 21 industry expertise, 19 cases, 4 results e 10 credentials. Origens: 149 curated_internal, 32 public_official e 14 restricted_internal. Há 193 aprovados para matching e 2 não aprovados. Isso comprova o arquivo, não sua importação no banco atual.
6. Governança de natureza/outcome e visibilidade do conhecimento; materiais privados originais e `.env.local` não estão rastreados no Git.
7. Correções já presentes em `7f692e3`: classificação de agregador antes de pistas de título, campos separados de consulta/entidade/escopo, apresentação compacta parcial, estados de Fit e footer condicionado ao modo demo explícito.
8. Testes adversariais e SQL existentes. Devem ser ampliados onde há lacunas, sem enfraquecer validadores.

## CORRIGIR — performance e execução

### P0 — um executor pode trabalhar simultaneamente com outro

`tickExternalResearchAction` chama diretamente `tickExternalCompanyResearch`, enquanto o worker adquire lock. O orchestrator não exige a posse desse lock. Dois browsers ou browser + worker podem entrar na mesma etapa antes da transição de estado, executar chamadas externas e gravar efeitos duplicados. O compare-and-set de transição ao final não protege os efeitos anteriores.

O semáforo de Ollama é uma variável de módulo em memória; limita chamadas no processo correspondente, não entre web, worker e réplicas. Assim, `OLLAMA_MAX_CONCURRENT_REQUESTS=1` não é um limite global da implantação.

**Correção proposta:** um único contrato de posse por run para qualquer executor; browser consulta progresso, worker executa. Renovação periódica de lease durante etapas demoradas, verificação de posse antes de publicar e cancelamento efetivo das operações.

### P0 — worker espera pelo próprio lock

`listEligibleResearchRunsForWorker` aceita somente lock nulo ou vencido. Após etapa não terminal, o worker renova o lock por **120.000 ms**, sem liberá-lo e sem incluir runs do próprio worker na próxima seleção. O polling de 250 ms/5 s não elimina essa espera: o run fica inelegível até vencer.

Além disso, heartbeat acontece antes/depois do tick, não durante. Uma chamada ao modelo pode durar até 600.000 ms; portanto o lease pode expirar enquanto a etapa ainda trabalha, permitindo outro worker. Erros de heartbeat/release retornados pelo banco não são verificados nessas funções.

**Constatação estática:** há atraso e vulnerabilidade a concorrência no controle do worker. **Ainda não medido:** quanto da lentidão da máquina original cada um explica.

### P1 — amplificação de trabalho e falta de orçamento global

- `maybeGenerateFirstUsefulIntelligence` pode executar sinais, inteligência, Fit, oportunidades e ações durante claims; fases posteriores voltam a chamar esses serviços. Fingerprints evitam parte das promoções/validações, mas não toda a reconsulta, hidratação e derivação. Não afirmar que toda chamada repete inferência: isso depende do estado persistido.
- `runEfesoFitForCompany` percorre todos os objetos ativos elegíveis, consulta objeto/tags/relações e objetos relacionados, e valida semanticamente cada candidato novo com score positivo. Não há seleção curta global antes das validações caras.
- `loadAccountSignals`, relatórios e histórico de empresas têm consultas por item e carregamentos repetidos; o histórico reconstrói traceability por empresa.
- Ollama permite um reparo JSON, tentativas de transporte, timeout de dez minutos, `keep_alive: 30m` e aumento automático de contexto para pelo menos 8192 em prompts maiores. Modelos de extração/validação/geração podem ser diferentes. Isso pode manter modelos residentes e ampliar RAM/VRAM; depende dos modelos e hardware reais.
- As 12 queries são disparadas em `Promise.all`, sem limitador próprio de concorrência. Há retries no provider, não uma fila que limite o fan-out da descoberta.
- A ingestão tenta até preencher quantidade de fontes, não cobertura de evidência material. Há URLs oficiais presumidas que podem não existir.

**Correção proposta:** pré-filtrar antes do modelo, carregar conhecimento em lote, reaproveitar resultados por fingerprint/input/version, limitar trabalho global e acionar enriquecimento por lacunas de evidência. Não reduzir qualidade para ganhar tempo.

### P1 — download e PDF não têm limites efetivos completos

Em `fetch-safe.ts`, o timer é removido assim que os headers chegam; `arrayBuffer()` lê o corpo depois disso. Sem Content-Length confiável, o limite de bytes só é verificado depois de alocar o corpo inteiro. O limite total da pesquisa também é verificado após o download.

O parser PDF rejeita documentos acima do limite padrão de páginas, em vez de extrair páginas úteis com cobertura explicitada. Relatórios anuais longos podem desaparecer justamente onde a evidência primária é melhor. O documento PDF não é destruído em `finally`, inclusive nos retornos antecipados.

**Correção proposta:** leitura em streaming com timeout/cancelamento até o fim e teto de bytes em curso; parsing com descarte de recursos e política explícita para documentos longos.

## CORRIGIR — qualidade da pesquisa

### P0 — parar no primeiro fato não é suficiência de pesquisa

Em `phaseClaims`, após qualquer claim promovida existir, o loop chama a geração progressiva e executa `break`. Sem candidatos pendentes, a fase avança para sinais e deixa outras fontes baixadas sem extração. Não há comprovação de cobertura operacional ou triangulação para parar.

Com Ollama, a seleção local começa com uma janela de 4.000 caracteres por snapshot. O score favorece números e termos financeiros. A janela adicional só aparece quando nenhum candidato foi processado, não quando os candidatos são irrelevantes ou insuficientes.

Isso explica um mecanismo genérico compatível com o padrão Luxottica: busca ampla, gasto com captura e validação, seguida de um único fato financeiro e baixa cobertura operacional. Não comprova retrospectivamente a sequência exata daquele run sem seus registros.

### P1 — seleção e atualidade incompletas

- `selectAcceptedSources` corta a lista antes de `rankSourcesForInitialPass`; resultados melhores que cheguem depois do teto podem nem disputar a seleção inicial.
- `horizonMonths` chega à descoberta, mas `assessSource` aplica 24 meses fixos. O provider não recebe filtro temporal e queries contêm anos fixos 2024/2025/2026.
- Datas ausentes não reprovam por atualidade; documentos institucionais têm exceção; ranking usa bônus fixo para ano >= 2025.
- `findReusableSnapshot` reutiliza a última captura por URL sem TTL ou revalidação. Uma página de resultados atualizada pode continuar fornecendo conteúdo antigo indefinidamente.
- `registrableDomain` usa os dois últimos segmentos, errando domínios como `valor.globo.com` e `*.com.br`. As listas de publishers e sua aplicação ficam inconsistentes.
- `urlSubstanceScore` detecta domínio oficial por substring da URL, enquanto outros módulos usam comparação real de hostname. Um domínio impostor pode receber o mesmo bônus de prioridade.
- PDFs descobertos pelo fallback são todos rotulados `earnings_release`, sem classificação do documento e sem data, mesmo que sejam outro tipo de PDF.

### P0 — gate de qualidade pode aprovar sem os requisitos críticos

`evaluateResearchQualityGate` retorna `signal_found` imediatamente quando há sinal, antes de verificar confirmação da entidade. Não exige precisão/proveniência/atualidade nos sinais nesse ramo.

`company-briefing-service` passa `recentMaterialClaimCount: activeClaims.length`: mede quantidade de claims, não atualidade nem materialidade. `secondaryOnlyClaimCount` depende da existência de qualquer fonte primária retida, não da evidência de cada claim. O histórico usa defaults otimistas de `deriveCompanyResearchOutcome`, podendo divergir do relatório.

**Correção proposta:** derivar métricas a partir das evidências realmente citadas, validar identidade e proveniência antes da publicação e compartilhar a mesma avaliação entre histórico e relatório. Não basta adicionar mais campos à assinatura do gate.

### P1 — pesquisa genérica existe, resolução genérica ainda é limitada

Empresas fora do catálogo podem ser confirmadas manualmente e criadas/reutilizadas; isso é funcionalidade real que deve permanecer. Porém `resolveCompanyEntity` consulta workspace e catálogo estático, sem resolver identidades novas pela web. `CompanyIdentity` não representa explicitamente parent/subsidiary/brand.

Luxottica/Essilor são aliases do grupo no catálogo; Toyota já tem casos globais e brasileiros cadastrados. A inferência de domicílio por sufixo de domínio não é confirmação de sede. Usar país da pesquisa para escolher automaticamente uma subsidiária também pode alterar a entidade pretendida.

**Correção proposta:** identidade e relações verificadas com fontes públicas, confirmação de candidatos e separação explícita de entidade/escopo. Catálogo é auxílio, não a estratégia de cobertura universal.

### P1 — precisão de claims e interpretação comercial

Os schemas carregam métrica, moeda, unidade, período, geografia e citações, mas não há uma regra determinística específica que rejeite a métrica ambígua `earnings`. Prompts e validação semântica gerais podem reconhecer ambiguidades; isso ainda depende da resposta do modelo.

Há hipóteses de trabalho e próximos passos construídos por regex e texto padrão em `company-briefing-service`, inclusive apresentação de candidatos de ação rejeitados. Precisam de revisão para não reintroduzir sugestões comerciais que os validadores impediram de promover.

## CORRIGIR — EFESO Fit, autenticação e proteção de dados

### Fit implementado, mas parcialmente taxonômico e com estado aparente

O Fit usa sinais reais, tags, tipos, temas, setor, casos e resultados, seguido de validação semântica. Não é apenas busca de palavras; também não implementa integralmente a cadeia de necessidade operacional contextual pedida na especificação. Score positivo por setor/geografia pode levar um objeto à validação cara mesmo sem forte necessidade operacional.

O relatório possui quatro estados de Fit, porém passa `knowledgeError: false` fixo. Ausência de fit promovido é apresentada como avaliação sem aderência quando há sinais, mesmo sem prova de que o pack estava disponível e a avaliação terminou. Carregamento de sinais/Fit por empresa também mistura histórico com execução mais recente; isso requer semântica temporal explícita.

### P0 — allowlist não protege diretamente todas as leituras do banco

A camada da aplicação consulta allowlist e bloqueia disabled/ausentes. A migration 043 cria a tabela, mas não atualiza `is_active_workspace_member` / `is_workspace_admin` da migration 039: continuam baseadas na membership ativa. Desabilitar só a allowlist não revoga uma membership ativa no RLS de acesso direto com sessão ainda válida.

**Correção proposta:** mesma autorização efetiva na aplicação e no banco, com testes de sessão já aberta após desativação; primeiro acesso/reativação devem ser atômicos. Validar com SQL real antes de declarar resolvido.

Outros achados:

- No envio de magic link, falha ao consultar allowlist cai em `catch` e ainda envia OTP com criação de usuário permitida. O gate da aplicação permanece, mas a etapa de admissão não falha fechada.
- Callback aceita `next` iniciado em `/`, incluindo `//host-externo`; deve validar caminho local e origem.
- A migration 043 insere allowlist de contas demo incondicionalmente; remover o acoplamento com instalação produtiva.
- `HttpExternalResearchProvider` chama `safeFetch({url})` sem lookup DNS. O bloqueio de endereços privados resolvidos só acontece quando `lookup` é fornecido. Há também cobertura incompleta de IPv6 privado. A proteção SSRF existente é uma base a corrigir, não uma garantia completa.
- Hidratação de Fit e near-misses consulta com service role e retorna nomes/rationale de objetos sem aplicar integralmente as regras de visibilidade do catálogo. Sanitizar apenas explicações não assegura que nomes, relações e componentes restritos não cheguem ao membro. Requer teste com objetos restricted/admin-only no relatório e payload do client component.

## SIMPLIFICAR

- Um dono de execução por run; progresso de browser somente consulta estado.
- Uma sequência de geração/enriquecimento com checkpoints reaproveitáveis, em vez de duas rotas de geração completa.
- Avaliação de outcome única para histórico, progresso e relatório, usando os mesmos dados.
- Leitura em lote para sinais/conhecimento/traceability e resumo persistido do histórico.
- Relatório condicional: a versão atual já reduziu seções, mas ainda repete ausências e expõe códigos como `signal_found`, estados em inglês e linguagem de promoção.
- Isolar módulos de relacionamento/ações fora do caminho crítico quando não houver oportunidade sustentada. Não apagar dados ou infraestrutura que ainda tenham referências.

## REMOVER

- Premissas fixas de identidade/cadastro usadas como se provassem pesquisa genérica.
- IDs de usuário/workspace de fallback em `scripts/run-quality-research.ts`; seleção arbitrária do primeiro workspace/member não é uma preparação confiável de benchmark.
- Hipóteses/próximos passos padrão que contornem decisões de rejeição; retirar sua apresentação até existir suporte explícito.
- Duplicação de processamento progressivo que não produza informação adicional.
- Copy e documentação obsoletas: README ainda descreve navegação anterior e limitações ainda mencionam OpenAI como pendência central.
- Rotas antigas realmente sem uso, após verificar referências. Várias rotas de empresa já são redirects: presença no inventário não prova que exista uma tela duplicada a apagar.

## FALTANDO

1. Baseline de **um único run real**: wall time por fase, CPU/RSS do web e worker, memória e modelos residentes do Ollama, tamanho/contexto dos modelos, chamadas/tokens/retries, buscas, downloads, extrações e cache hits. Contabilizar também trabalho entre processos e tempo de fila.
2. Orçamento e cancelamento ponta a ponta, renovação contínua de lease e teste real de concorrência browser/worker/dois workers.
3. Cobertura de pesquisa/materialidade como condição de parada, não primeiro fato nem volume mínimo de fontes.
4. Testes ponta a ponta com dados reais e autenticação real, separados da preparação demo. Embraer/Suzano são regressões importantes, mas não revalidadas aqui.
5. Teste de empresa nova realmente fora do catálogo. `tests/klabin-e2e.ts` exige Klabin unresolved, mas o catálogo já a resolve; o teste falha antes mesmo de consultar providers.
6. Regressão Luxottica que valide fontes primárias substantivas, identidade, precisão e honestidade do resultado — sem exigir sinal artificial.
7. Aceitação para entidade ambígua, empresa com pouca informação, ausência de fit e knowledge indisponível.
8. Revogação efetiva no RLS e garantia de não vazamento de conhecimento restrito via dados derivados.
9. Release Health verificando propriedades reais. Hoje afirma RLS ativo com orientação para consultar testes; presença de `efeso_fits` não comprova todas as migrations; quantidade de objetos ativos não comprova origem real.
10. Inicialização produtiva corrigida: Compose injeta `.env`, mas `worker:research` exige arquivo `.env.local`, ausente na imagem e excluído do contexto. É defeito do artefato de entrega, não falta de credencial.
11. `.dockerignore` deve excluir todos os arquivos de segredo de produção; `.env.production` não é coberto pelos padrões atuais. A cópia do runner é seletiva, mas o builder recebe o contexto inteiro.

## Verificações executadas

| Verificação | Resultado e limite |
|---|---|
| Branch e HEAD | Correspondem exatamente ao solicitado |
| Instalação | `npm ci --ignore-scripts --no-audit --no-fund` concluído; lockfile preservado |
| Testes locais | **254 passaram; 0 falhas; 0 skips**, aproximadamente 3,27 s |
| TypeScript | Passou após `next typegen`; execução inicial em checkout limpo falhou por ausência de `PageProps`/`LayoutProps` gerados |
| ESLint | `npx eslint src scripts --max-warnings=0` passou |
| Build | `npm run build` passou; compilação 14,7 s e etapa TypeScript 7,9 s; não é benchmark de pesquisa |
| SQL/RLS | Não executado: banco de teste não configurado |
| Regressões reais/browser | Não executadas: infraestrutura/credenciais não configuradas |
| `release:check` completo | Não aprovado/não executado como conjunto: exige `.env.local`, credenciais e banco; checks locais acima foram executados separadamente |

O comando `tsx --test` falhou inicialmente por restrição de socket IPC do ambiente (`EPERM`), antes de executar testes. A mesma suíte foi executada com `node --import tsx --test`, sem alterar testes. A seleção incluiu parsers, extraction, providers, knowledge, signals, intelligence, opportunities, relationship, recommended-actions, access, external-research, product, signal-display e demo-content.

Reproduções determinísticas adicionais, sem rede/modelo:

| Entrada | Resultado atual |
|---|---|
| `resolveCompanyEntity({query: 'Klabin', country: 'BR'})` | `resolved`; contradiz a pré-condição do E2E “fora do catálogo” |
| Gate com 1 sinal, entidade não confirmada, 0 fontes primárias, 0 claims recentes | `signal_found`, relatório completo permitido |
| Descoberta com horizonte de 1 mês, data de referência 21/10/2026, notícia de 01/01/2025 | Fonte aceita; horizonte solicitado ignorado |
| Score de `essilorluxottica.com.evil.example/production.pdf` versus domínio oficial | Ambos 165 no helper de prioridade; não significa que ambos sejam classificados como primários por todos os outros módulos |

## Ordem de correção proposta

1. Corrigir posse/renovação/cancelamento do worker e impedir execução concorrente por browser; instrumentar e medir um run seguro.
2. Corrigir fetch/DNS/streaming e recursos de PDF; fechar revogação RLS e exposição de conhecimento restrito antes de ampliar uso.
3. Corrigir seleção antes do corte, fontes oficiais, domínio/publisher, datas/horizonte e revalidação de cache.
4. Substituir parada no primeiro fato por cobertura/materialidade; preservar validação rigorosa e limitar inferências por necessidade.
5. Tornar o gate baseado em identidade, precisão, proveniência e evidências recentes; unificar histórico/relatório.
6. Reduzir consultas e validações caras de Fit com pré-seleção fundamentada; registrar estados reais de execução e disponibilidade de conhecimento.
7. Ajustar UX condicional, idioma e apresentação de hipóteses; corrigir scripts e documentação operacional.
8. Rodar regressões determinísticas, SQL, concorrência e browser; depois um conjunto pequeno de empresas reais diversas, em sequência controlada.
9. Rodar release check completo e comparar performance antes/depois. Publicação permanece dependente de autorização explícita.

## Bloqueios externos e trabalho interno

Para medir pesquisas reais e validar o produto, este ambiente precisa de Supabase de teste com migrations/pack, credencial Tavily e endpoint Ollama com modelos instalados. Aceitação de login exige usuário EFESO autorizado e configuração de envio/callback. Produção ainda requer host/HTTPS/URL e credenciais correspondentes.

Essas dependências não impedem correções determinísticas. Também não justificam declarar que infraestrutura é o único bloqueio: os defeitos de código e de entrega listados acima ainda precisam ser corrigidos e verificados.

Nenhum commit foi criado. Nenhum estado foi publicado.
