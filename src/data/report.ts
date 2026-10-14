import type { ReportSection } from "@/types";

/**
 * Structured report content for Natura.
 * Follows REPORT_LOCALE (pt-BR), independent of the UI locale.
 */
export const reportSections: ReportSection[] = [
  {
    id: "executive-signal",
    number: "01",
    title: "Sinal executivo",
    blocks: [
      {
        kind: "paragraph",
        text: "A Natura entra em um ciclo de expansão industrial no Brasil enquanto o grupo persegue uma agenda explícita de melhoria de margem. A evidência indica que disciplina de ramp-up, planejamento e transparência de custos devem estar na agenda operacional nos próximos 12–24 meses.",
      },
      {
        kind: "key-findings",
        items: [
          { text: "Novo investimento no complexo industrial de Cajamar confirmado (mar. 2026).", type: "verified", claimId: "clm-01" },
          { text: "Estoque cresceu 18% a/a contra crescimento de receita de 6% em 2025.", type: "derived", claimId: "clm-02" },
          { text: "A expansão pode tensionar velocidade de ramp-up, estabilidade e prontidão da força de trabalho.", type: "hypothesis", claimId: "clm-11" },
          { text: "A capacidade instalada atual não pode ser determinada com segurança a partir de fontes públicas.", type: "conflict", claimId: "clm-04" },
        ],
      },
      {
        kind: "metrics",
        items: [
          { label: "Oportunidades identificadas", value: "4" },
          { label: "Força alta", value: "2" },
          { label: "Cobertura de fontes primárias", value: "81%" },
          { label: "Conflitos detectados", value: "2" },
        ],
      },
    ],
  },
  {
    id: "company-snapshot",
    number: "02",
    title: "Retrato da empresa",
    blocks: [
      {
        kind: "table",
        columns: ["Atributo", "Valor", "Status"],
        rows: [
          ["Entidade legal", "Natura Cosméticos S.A."],
          ["Grupo", "Natura &Co"],
          ["Setor", "Consumo e Beleza"],
          ["Sede", "São Paulo, Brasil"],
          ["Canal principal", "Venda direta e digital"],
          ["Relevância Brasil", "Alta — mercado doméstico e principal base industrial"],
        ],
        rowTypes: ["verified", "verified", "verified", "verified", "verified", "derived"],
      },
      {
        kind: "paragraph",
        text: "A Natura opera um modelo integrado, combinando manufatura própria no Brasil com uma grande rede de venda direta. A informação pública sustenta que o Brasil permanece tanto o principal mercado quanto a principal base industrial do grupo.",
      },
    ],
  },
  {
    id: "brazil-operations",
    number: "03",
    title: "Operações no Brasil",
    blocks: [
      {
        kind: "metrics",
        items: [
          { label: "Unidades industriais", value: "5", type: "verified" },
          { label: "Centros de distribuição", value: "2", type: "conflict", note: "A definição diverge entre as fontes" },
          { label: "Colaboradores (Brasil)", value: "4.300", type: "verified", note: "Divisão por função não divulgada" },
        ],
      },
      {
        kind: "table",
        title: "Footprint industrial (informação pública)",
        columns: ["Unidade", "Estado", "Papel", "Status"],
        rows: [
          ["Cajamar", "SP", "Principal complexo industrial; expansão em andamento"],
          ["Benevides", "PA", "Sabonetes e insumos de origem amazônica"],
          ["Demais unidades", "—", "Não detalhadas individualmente em fontes públicas"],
        ],
        rowTypes: ["verified", "verified", "hypothesis"],
      },
      {
        kind: "callout",
        tone: "conflict",
        title: "Conflito detectado — capacidade instalada",
        text: "Fontes de 2023, 2024 e 2025 reportam números de capacidade irreconciliáveis. O Signal excluiu a capacidade instalada da modelagem quantitativa. Ver seção 13.",
      },
    ],
  },
  {
    id: "strategic-agenda",
    number: "04",
    title: "Agenda estratégica",
    blocks: [
      {
        kind: "key-findings",
        title: "Prioridades declaradas publicamente",
        items: [
          { text: "Iniciativa plurianual de margem e eficiência de SG&A, com a América Latina como região prioritária.", type: "verified", claimId: "clm-05" },
          { text: "Modernização e expansão da manufatura brasileira.", type: "verified", claimId: "clm-01" },
          { text: "Liderança de transformação no grupo, com mandato de operações e custo.", type: "verified", claimId: "clm-10" },
          { text: "Digitalização mencionada apenas em termos gerais.", type: "hypothesis", claimId: "clm-12" },
        ],
      },
      {
        kind: "paragraph",
        text: "A combinação de um investimento de capital e uma agenda de margem é relevante: a gestão adiciona capacidade e se compromete com eficiência ao mesmo tempo, o que em geral exige ramp-up disciplinado e gestão de desempenho.",
      },
    ],
  },
  {
    id: "recent-signals",
    number: "05",
    title: "Sinais recentes",
    blocks: [
      {
        kind: "table",
        columns: ["Período", "Sinal", "Categoria", "Status"],
        rows: [
          ["mar. 2026", "Novo investimento industrial no Brasil anunciado", "Manufatura"],
          ["jan. 2026", "Iniciativa de melhoria de margem anunciada", "Estratégia"],
          ["dez. 2025", "Estoque cresceu materialmente mais rápido que as vendas", "Desempenho financeiro"],
          ["nov. 2025", "Papel de liderança de transformação criado", "Organização"],
          ["set. 2024", "Expansão de capacidade de ~30% sinalizada", "Manufatura"],
        ],
        rowTypes: ["verified", "verified", "derived", "verified", "verified"],
      },
    ],
  },
  {
    id: "financial-signals",
    number: "06",
    title: "Sinais financeiros e de desempenho",
    blocks: [
      {
        kind: "metrics",
        items: [
          { label: "Crescimento de estoque a/a", value: "+18%", type: "derived" },
          { label: "Crescimento de receita a/a", value: "+6%", type: "verified" },
          { label: "Variação da margem bruta LatAm", value: "−1,4 p.p.", type: "derived" },
          { label: "Ponte de margem do Brasil", value: "n/d", note: "Evidência pública insuficiente" },
        ],
      },
      {
        kind: "paragraph",
        text: "As métricas derivadas usam números consolidados ou da América Latina. O desempenho financeiro específico do Brasil não é divulgado no nível de detalhe necessário; o Signal trata a América Latina como proxy e rotula isso explicitamente.",
      },
      {
        kind: "callout",
        tone: "hypothesis",
        title: "Hipótese do Signal",
        text: "O crescimento de estoque pode refletir problemas de planejamento e acurácia de forecast em um portfólio complexo de venda direta, e não uma formação deliberada de estoque. Exige validação com o cliente.",
      },
    ],
  },
  {
    id: "operational-intelligence",
    number: "07",
    title: "Inteligência operacional",
    blocks: [
      {
        kind: "key-findings",
        items: [
          { text: "Contratações industriais na região de Cajamar aumentaram no 1º trim. 2026 (fonte única e não primária).", type: "derived", claimId: "clm-07" },
          { text: "Expansão de ~30% da capacidade instalada sinalizada publicamente.", type: "verified", claimId: "clm-06" },
          { text: "Nenhuma informação pública descreve o plano de ramp-up, a linha de base de OEE ou os gargalos.", type: "hypothesis", claimId: "clm-11" },
        ],
      },
      {
        kind: "list",
        title: "O que o Signal não conseguiu estabelecer",
        items: ["OEE atual", "Curva de ramp-up", "Principais gargalos", "Índice de refugo"],
      },
    ],
  },
  {
    id: "market-context",
    number: "08",
    title: "Contexto de mercado e competitivo",
    blocks: [
      {
        kind: "paragraph",
        text: "O mercado brasileiro de beleza e cuidados pessoais deve crescer a um dígito baixo em termos reais em 2026, após um 2025 mais forte. Um mercado mais lento aumenta a importância relativa de custo, produtividade e disciplina de estoque.",
      },
      {
        kind: "table",
        columns: ["Indicador", "Valor", "Status"],
        rows: [
          ["Perspectiva de crescimento da categoria 2026 (Brasil)", "Um dígito baixo, real"],
          ["Intensidade competitiva", "Alta — players multinacionais e locais"],
          ["Mudança de canal", "Venda direta complementada pelo digital"],
        ],
        rowTypes: ["verified", "hypothesis", "verified"],
      },
    ],
  },
  {
    id: "opportunity-map",
    number: "09",
    title: "Mapa de oportunidades EFESO",
    blocks: [
      {
        kind: "table",
        columns: ["Oportunidade", "Força", "Score", "Fit EFESO", "Evidência"],
        rows: [
          ["Ramp-up e produtividade industrial", "Forte", "86", "Excelente", "Forte"],
          ["Capital de giro e planejamento", "Forte", "81", "Forte", "Moderada"],
          ["Competitividade de custos", "Moderada", "72", "Forte", "Moderada"],
          ["Operações digitais", "Fraca", "48", "Moderado", "Insuficiente"],
        ],
      },
      {
        kind: "paragraph",
        text: "Os scores combinam força do sinal, qualidade da evidência e fit da EFESO Brasil. Todas as oportunidades exigem validação com o cliente antes de qualquer quantificação.",
      },
    ],
  },
  {
    id: "opportunity-deep-dives",
    number: "10",
    title: "Deep dives de oportunidades",
    blocks: [
      { kind: "opportunity", opportunityId: "opp-manufacturing" },
      { kind: "opportunity", opportunityId: "opp-working-capital" },
      { kind: "opportunity", opportunityId: "opp-cost" },
      { kind: "opportunity", opportunityId: "opp-digital" },
    ],
  },
  {
    id: "efeso-fit",
    number: "11",
    title: "Fit EFESO",
    blocks: [
      {
        kind: "table",
        columns: ["Oportunidade", "Capacidades relevantes da EFESO", "Fit"],
        rows: [
          ["Ramp-up e produtividade industrial", "Manufatura · Excelência operacional · Pessoas e Organização", "Excelente"],
          ["Capital de giro e planejamento", "Supply Chain · Capital de giro", "Forte"],
          ["Competitividade de custos", "Custo e lucratividade · Excelência operacional · Compras", "Forte"],
          ["Operações digitais", "Operações digitais · Excelência operacional", "Moderado"],
        ],
      },
      {
        kind: "paragraph",
        text: "O fit reflete capacidades que a EFESO Brasil pode de fato entregar com times locais. As referências de capacidade serão conectadas à Base de conhecimento da EFESO em uma iteração futura.",
      },
    ],
  },
  {
    id: "client-discovery",
    number: "12",
    title: "Agenda de discovery com o cliente",
    blocks: [
      {
        kind: "list",
        title: "Perguntas sugeridas de discovery",
        ordered: true,
        items: [
          "Como o ramp-up de Cajamar está sendo governado e qual é a curva-alvo?",
          "Qual é a linha de base atual de OEE e as principais categorias de perda nas linhas expandidas?",
          "Como está estruturado o plano de onboarding da força de trabalho para as novas funções industriais?",
          "O que explicou o crescimento de estoque em 2025 e como a posição do Brasil se compara?",
          "Qual é o escopo do programa de margem — SG&A, precificação ou custo de conversão?",
          "Há um roadmap digital específico de manufatura ligado ao investimento?",
        ],
      },
    ],
  },
  {
    id: "risks-contradictions",
    number: "13",
    title: "Riscos e contradições",
    blocks: [
      {
        kind: "callout",
        tone: "conflict",
        title: "Conflito — Capacidade atual de produção",
        text: "Fonte A (2023): 2,0 milhões de unidades/ano. Fonte B (2024): expansão de 30% da capacidade anunciada. Fonte C (2025): capacidade instalada atualizada não divulgada. Conclusão do Signal: a capacidade instalada atual não pode ser determinada com segurança. Decisão: excluída da modelagem quantitativa de oportunidades.",
      },
      {
        kind: "callout",
        tone: "conflict",
        title: "Conflito — Número de centros de distribuição",
        text: "O documento regulatório lista 2 centros de distribuição; o relatório anual menciona 3 hubs logísticos. As definições parecem divergir. Documento regulatório adotado; materialidade baixa.",
      },
      {
        kind: "list",
        title: "Riscos da análise",
        items: [
          "O sinal de contratação se apoia em uma fonte única e não primária.",
          "Números da América Latina usados como proxy do Brasil.",
          "Agenda digital inferida apenas de declarações genéricas.",
        ],
      },
    ],
  },
  {
    id: "evidence-quality",
    number: "14",
    title: "Qualidade da evidência",
    blocks: [
      {
        kind: "metrics",
        items: [
          { label: "Achados verificados", value: "7", type: "verified" },
          { label: "Métricas derivadas", value: "3", type: "derived" },
          { label: "Hipóteses", value: "3", type: "hypothesis" },
          { label: "Conflitos", value: "2", type: "conflict" },
        ],
      },
      {
        kind: "table",
        columns: ["Dimensão", "Avaliação"],
        rows: [
          ["Qualidade da evidência", "Forte"],
          ["Cobertura de fontes primárias", "81%"],
          ["Áreas com dados insuficientes", "3 — OEE/curva de ramp-up, ponte de margem do Brasil, roadmap digital"],
          ["Recência", "Fontes centrais datadas dos últimos 12 meses"],
        ],
      },
    ],
  },
  {
    id: "sources-appendix",
    number: "15",
    title: "Apêndice de fontes e evidências",
    blocks: [
      {
        kind: "paragraph",
        text: "Fontes retidas após triagem de relevância e confiabilidade. As fontes primárias estão marcadas. Todos os registros são dados sintéticos de demonstração.",
      },
      {
        kind: "sources",
        sourceIds: [
          "src-01", "src-02", "src-03", "src-04", "src-05", "src-06",
          "src-07", "src-08", "src-09", "src-10", "src-11", "src-12",
        ],
      },
    ],
  },
];
