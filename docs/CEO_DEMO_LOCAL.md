# SIGNAL — apresentação local

Este roteiro usa o frontend refinado e cenários fictícios isolados. Não é uma pesquisa real nem uma aprovação de produção.

## Abrir no Mac

1. Descompacte `signal-recovery-2026-10-27.zip` em uma pasta nova e entre na pasta `signal-recovery` pelo Terminal.
2. Use uma versão do Node compatível com Next.js 16 (a validação desta recuperação usou Node 24.22.1).
3. Execute `npm ci` e depois `npm run preview:local`. Não copie arquivos `.env` nem credenciais.
4. Após aparecer `Ready`, abra **http://127.0.0.1:3000/preview/companies** no navegador desse mesmo computador. Mantenha o Terminal aberto.

O endereço loopback abre somente no computador que executa o servidor. Um servidor no ambiente remoto não fica acessível pelo localhost do seu Mac. Não há hospedagem pública nem deploy nesta entrega.

Se a porta 3000 estiver ocupada, execute `SIGNAL_PREVIEW_PORT=3001 npm run preview:local` e use http://127.0.0.1:3001/preview/companies. Para encerrar, pressione Control+C no Terminal.

## Roteiro de cinco minutos

1. **Empresas:** apresente o histórico simples e a navegação Empresas / Nova pesquisa / Conta.
2. **Horizonte Industrial:** abra o relatório com movimento. Mostre a tese, interpretação operacional, aderência e oportunidade a validar. Expanda uma evidência para mostrar a fonte secundária à leitura principal. São exemplos fictícios.
3. **Verde Papel:** apresente o estado somente com fatos e a explicação de por que não há sinal. Sem oportunidade forçada.
4. **Oficina Delta:** apresente a evidência insuficiente e as lacunas, sem KPIs zerados.
5. **Nova pesquisa:** mostre a entrada principal pelo nome, “Mais opções” e a confirmação. Os controles de preview permitem demonstrar identificação, empresa existente, ambiguidade e ausência de identificação, sem consulta externa.
6. **Progresso e Conta:** abra “Atualizar pesquisa” em uma empresa para ver o progresso ilustrativo; o controle de etapas fica recolhido ao final. Conta mostra o ambiente e informa que não existe sessão autenticada, sem inventar uma pessoa ou um e-mail.

Mantenha visível o aviso PREVIEW LOCAL. Não apresente esses dados como resultados de Embraer, Suzano ou EssilorLuxottica. A pesquisa real requer Supabase/Auth, Tavily, Ollama/modelo e usuário/workspace autorizados.

## Validação em 27/10/2026

- Estado recuperado dos 11 commits: `4acb5f9d99110a3f2c602dc8b893232aa85626b2`.
- 279 testes determinísticos aprovados, zero falhas e zero skips.
- TypeScript e ESLint de src/scripts aprovados.
- 51 migrations aplicadas em PostgreSQL WASM; checks locais de autorização/RLS, ownership/fencing e privacidade aprovados. Não substitui integração Supabase/pgTAP nem corrida multiprocesso.
- Build Next.js 16.4.3 aprovado.
- Smoke HTTP de produção aprovado: login, rotas protegidas, callback e preview recusado em produção mesmo com flag habilitada.
- HTTP de desenvolvimento aprovado para navegação, formulário, resolução, fases, três relatórios, evidências, Conta e Admin. Zero chamadas aos endpoints Supabase/Ollama instrumentados; host não local recusado.
- Revisão visual/interativa no navegador remoto não concluída: o navegador não alcançou o loopback do servidor (`ERR_CONNECTION_REFUSED`) e sua política bloqueou a abertura de snapshots por `file:`. Não há alegação de QA visual completo.
- EssilorLuxottica: preflight bloqueado por configuração externa; nenhuma pesquisa real iniciada.

## Recuperação

O bundle é o arquivo principal: conserva os hashes e o histórico originais. O patch oferece uma alternativa que pode recriar IDs diferentes; o ZIP é apenas uma árvore de código filtrada. Consulte o manifesto para hashes, checksums e comandos de restauração.

Nenhum push, merge em main, tag ou deploy foi realizado. A indisponibilidade de escrita no GitHub permanece separada da apresentação local.
