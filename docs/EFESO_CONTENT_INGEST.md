# Ingestão operacional de conteúdo real EFESO

Não exige mudança de arquitetura. Não ingerir conteúdo real até ele ser fornecido.

1. **Upload no Extraction Lab** (`/admin/extraction-lab`)  
   TXT ou PDF com camada de texto. Associar a uma análise e ResearchRun persistidos.

2. **Extração**  
   O modelo propõe candidatos; validadores determinísticos e semânticos decidem.

3. **Knowledge Lab** (`/admin/knowledge-lab`)  
   Sobre um SourceSnapshot já interpretado. Promove KnowledgeObjects ativos.

4. **Validação**  
   Revisar candidatos (needs_review vs promovidos). Nada entra na busca de produção sem status ativo.

5. **Promoção**  
   Somente objetos `active` alimentam Conhecimento EFESO, aderência, oportunidades e ações.

6. **Uso no Conhecimento EFESO**  
   `/knowledge/efeso` e a aba de inteligência da conta passam a recuperar o material promovido.

Labs são admin-only. Members veem só o conhecimento já promovido.
