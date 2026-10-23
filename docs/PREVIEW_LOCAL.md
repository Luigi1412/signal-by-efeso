# SIGNAL — revisão visual estritamente local

O preview permite navegar nos componentes atuais sem Supabase, credenciais ou pesquisa real. Não é evidência de qualidade da pesquisa nem uma versão de produção.

## Abrir no Mac

1. Pare o servidor anterior com **Control + C**.
2. Descompacte a nova cópia em uma pasta separada, por exemplo `SIGNAL_PREVIEW_LOCAL`. Preserve a pasta anterior e seus arquivos de configuração.
3. No Terminal, entre nessa pasta e execute:

```bash
npm ci
npm run preview:local
```

4. Quando aparecer `Ready`, abra **http://127.0.0.1:3000/preview** no navegador. Não é necessário login.
5. Mantenha o Terminal aberto. Para encerrar, use **Control + C**.

Se a porta estiver ocupada, pare o servidor anterior. Como alternativa, execute `SIGNAL_PREVIEW_PORT=3001 npm run preview:local` e abra `http://127.0.0.1:3001/preview`.

A cópia inclui Next.js e eslint-config-next 16.4.3. Não copie um `.env` real para executar este preview.

## Navegação

| Tela | Caminho após o endereço local |
|---|---|
| Empresas (home) | `/preview` ou `/preview/companies` |
| Nova pesquisa e confirmação | `/preview/research/new` |
| Progresso ilustrativo | `/preview/research/preview-local-horizonte-industrial` |
| Empresa ambígua na etapa de progresso | `/preview/research/preview-local-horizonte-industrial?phase=needs_user_resolution` |
| Relatório com movimento, Fit e oportunidade | `/preview/companies/horizonte-industrial` |
| Relatório somente com fatos | `/preview/companies/verde-papel` |
| Relatório de evidência insuficiente | `/preview/companies/oficina-delta` |
| Conta | `/preview/account` |
| Admin ilustrativo | `/preview/admin` |

No formulário, os controles identificados como PREVIEW LOCAL preenchem quatro exemplos: Orion (identificada), Horizonte (já pesquisada), Atlas (ambígua) e Sem cadastro (não identificada). Clique no botão normal do formulário para ver a confirmação. Selecionar ou confirmar abre apenas um progresso ilustrativo.

No progresso, selecione manualmente uma fase ou use Próxima fase ilustrativa. Também há estados de conclusão, falha, cancelamento e confirmação de entidade. Não há temporizador simulando uma execução real.

No relatório, links de evidência abrem documentos fictícios internos ao preview. Os trechos podem ser expandidos, o índice vertical pode ser usado e o botão de impressão mantém a identificação de preview. Atualizar pesquisa abre somente o progresso local. Na Conta, Sair retorna à home do preview sem chamar logout real.

Admin reutiliza a página inicial administrativa. Laboratórios e verificações operacionais não executam ações; seus links mostram a limitação do preview. Nenhuma saúde de infraestrutura é apresentada como aprovada.

## Isolamento

- Namespace separado `/preview`, fora do layout autenticado da aplicação.
- Exige simultaneamente `NODE_ENV=development`, `SIGNAL_LOCAL_PREVIEW=1` e hostname local. Headers de encaminhamento não locais são recusados.
- O launcher fixa o bind em `127.0.0.1`, recusa `NODE_ENV=production` e não modifica o ambiente de outros processos.
- O launcher esvazia as variáveis de acesso a Supabase, banco, Tavily e OpenAI no processo filho. Também desativa demo, fallback, worker e extração controlada. Esses valores têm precedência sobre arquivos `.env` carregados pelo Next.
- Produção responde 404 em todo o namespace, mesmo com a flag ligada. Há uma segunda verificação na página além da verificação no proxy.
- Autenticação, autorização, Server Actions, RLS, banco e pipeline de produção não recebem exceções de acesso.
- As páginas reais continuam protegidas e o comportamento de suas operações permanece o existente quando não há provider de preview.
- Os componentes compartilhados recebem um provider local de navegação e ações em memória apenas sob a rota de preview. Sem esse provider usam os links e Server Actions existentes.
- Fixtures têm origem `local_preview`, IDs com prefixo `preview-local-`, empresas fictícias, domínio `.invalid` e fontes em `/preview/sources/`. Não existe gravador, cache, importador ou persistência de fixtures.
- Nenhum objeto do Knowledge Pack privado é carregado. Fits e capabilities desta revisão são explicitamente ilustrativos e não representam avaliação EFESO real.
- Recarregar a página reinicia o estado em memória. Não há cookies de autenticação, localStorage ou sessão fictícia de usuário.

## Verificação

```bash
npm run test:unit
npm run typecheck
npm run lint
npm run test:preview-local
npm run build
node tests/http-smoke.mjs
```

O teste HTTP de desenvolvimento renderiza as telas com endpoints de serviço instrumentados como tripwire e exige zero chamadas externas. Verifica os três relatórios, host local, rotas normais ainda protegidas e as páginas administrativas sem operações. O smoke de produção exige 404 para o preview mesmo com a flag ativa.

Esta revisão não executa benchmark, não valida a pesquisa Luxottica, não aprova EFESO Fit real e não altera o veredito pendente do produto.
