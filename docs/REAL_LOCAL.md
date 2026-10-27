# SIGNAL — produto real no Mac

Este fluxo usa Auth, banco, Tavily e modelo reais. Não abre o preview e não cria pesquisas ou empresas sintéticas. O status continua BLOCKED até um login autorizado e uma pesquisa real end-to-end serem verificados.

## 1. Configuração privada

Na pasta do código, use Node compatível com Next.js 16 (validado com Node 24):

```bash
npm ci
npm run setup:local
open -e .env.local
```

O setup cria o arquivo com acesso restrito e nunca sobrescreve uma configuração existente. Não envie o conteúdo desse arquivo por chat.

Preencha **somente no `.env.local`**, que é ignorado pelo Git:

| Campo | Onde obter / ação |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Projeto Supabase existente → Connect → Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API Keys → publishable ou legacy anon. Nunca usar chave secret neste campo. |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → secret ou legacy service_role. Campo exclusivo do servidor. |
| `TAVILY_API_KEY` | Painel Tavily → API Keys → criar/copiar uma chave. |
| `OLLAMA_EXTRACTION_MODEL` | Nome exato de um modelo disponível em `ollama list`. Inicie Ollama no mesmo Mac com `ollama serve` se ainda não estiver ativo. |

O template já define o modo real, o worker, Tavily e `ALLOWED_EMAIL_DOMAINS=efeso.com`. Não adicione `gmail.com`.

Alternativa existente ao Ollama: defina `LANGUAGE_MODEL_PROVIDER=openai`, `OPENAI_API_KEY` e `OPENAI_EXTRACTION_MODEL`; a chave continua exclusiva do servidor. Não é necessário configurar Ollama nessa opção.

No Supabase, em **Authentication → URL Configuration**, configure:

- Site URL: `http://127.0.0.1:3000`
- Redirect URL permitida: `http://127.0.0.1:3000/auth/callback`

Em Authentication → Providers / Sign In, confirme o provedor Email habilitado. Se o serviço padrão de envio limitar os destinatários, configure SMTP próprio nas configurações de e-mail do Auth. O primeiro acesso exige receber e confirmar o link; nenhum script autentica usuários silenciosamente.

Referências oficiais: [API Keys](https://supabase.com/docs/guides/getting-started/api-keys), [Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls), [Tavily API keys](https://help.tavily.com/articles/9170796666-how-can-i-create-an-api-key).

## 2. Banco existente, sem reset

Vincule o projeto correto pela CLI normal. O project-ref é a identificação pública do projeto, não uma senha:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npm run db:plan
```

Confira o projeto e as migrations pendentes exibidas. Aplique sem `reset`:

```bash
npm run db:apply
npm run workspace:init
npm run import:efeso-knowledge -- --dry-run
npm run import:efeso-knowledge
```

São as 51 migrations originais e a migration aditiva 052 de exceção externa individual. `workspace:init` preserva um workspace existente, inclusive seu status. Não insere empresas ou fixtures. O importador valida o Knowledge Pack governado existente, sem modificá-lo. Não execute `seed:demo` neste fluxo.

## 3. Autorizar os dois endereços

```bash
npm run user:provision -- --email ariadne.garotti@efeso.com --role member
npm run user:provision -- --email luigigarotti@gmail.com --role member --approve-external-address
```

Os comandos criam/confirmam a allowlist e uma identidade Auth sem senha. Não enviam convites, não criam sessão e não marcam o e-mail como confirmado. Cada pessoa solicita seu próprio link em `/login`; a ativação usa o e-mail confirmado pelo Supabase. Usuários existentes são preservados. Contas revogadas exigem a opção explícita `--reactivate`.

A exceção do segundo comando vale somente para aquele endereço. Nenhum domínio externo é liberado. A autenticação não substitui a allowlist, e ambos os comandos usam o perfil de membro, sem conceder administração.

## 4. Iniciar app + worker reais

```bash
npm run check:real
npm run app:local
```

O primeiro comando não imprime valores secretos e não inicia pesquisa. Verifica disponibilidade quando há credenciais: Supabase/Auth, workspace, schema 052, RLS/ownership, contagem do Knowledge Pack, credencial Tavily e disponibilidade do modelo. Uma chave presente é identificada como configuração, nunca como prova de pesquisa real.

O segundo comando recusa configuração incompleta e inicia os processos existentes de app e worker. Abra **http://127.0.0.1:3000/companies** no mesmo Mac. Mantenha o Terminal aberto. Control+C encerra ambos.

Comandos separados, se necessário: `npm run dev -- --hostname 127.0.0.1` e, em outro Terminal na mesma pasta, `npm run worker:research`. Esses comandos não substituem o preflight. Sem Supabase configurado, o login informa indisponibilidade e não oferece bypass.

## 5. Primeira pesquisa real

Entre com uma das duas contas autorizadas, abra Nova pesquisa e informe **EssilorLuxottica**. Confirme a entidade matriz e o domínio oficial antes de continuar. A pesquisa deve persistir fontes e claims; confira entidade, fontes oficiais, datas, precisão, movimentos e incertezas antes de apresentar o resultado. Nenhum outcome é garantido.

Benchmark técnico opcional, apenas depois do primeiro login: preencha `SIGNAL_BENCHMARK_WORKSPACE_ID` com o ID real do workspace e `SIGNAL_BENCHMARK_EMAIL` com o e-mail já ativado. Execute:

```bash
npm run benchmark:research -- EssilorLuxottica
```

O benchmark usa Tavily e o provedor Ollama/OpenAI configurado e cria uma pesquisa real adicional. Não o execute em paralelo com a pesquisa pela interface. Não use conta demo. O HTTP smoke e o banco de testes local não substituem esse aceite.

## 6. Publicar o histórico pelo Git autenticado no Mac

Baixe o bundle atualizado, abra o Terminal na pasta em que ele foi salvo e use uma pasta de destino nova:

```bash
git clone --branch recovery/signal-v1 signal-recovery-2026-10-27.bundle signal-real
cd signal-real
git remote rename origin recovery-bundle
git remote add origin https://github.com/Luigi1412/signal-by-efeso.git
git push -u origin recovery/signal-v1:recovery/signal-v1
```

Se o Git pedir autenticação, use o mecanismo normal da sua conta. Com GitHub CLI instalada, pode usar `gh auth login --web --git-protocol https` e `gh auth setup-git`, depois repetir apenas o `git push`. Não coloque tokens em URLs ou comandos e não envie credenciais pelo chat.

O push é normal, sem force. Se o remoto tiver divergido, ele será recusado sem sobrescrever commits. Nenhum comando faz merge em main, tag ou deploy. O ZIP é para executar; o bundle é para recuperar e publicar os hashes originais.
