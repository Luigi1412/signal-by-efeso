import type { Conflict, EvidenceClaim } from "@/types";

/** Demo data — synthetic and not validated. Report-locale content (pt-BR). */
export const evidenceClaims: EvidenceClaim[] = [
  {
    id: "clm-01",
    companyId: "co-natura",
    claim: "Novo investimento industrial anunciado",
    type: "verified",
    confidence: 97,
    sourceIds: ["src-02", "src-04", "src-01"],
    geography: "Brazil",
    period: "Março de 2026",
    excerpt:
      "A empresa anunciou um programa de investimento para expandir e modernizar o complexo industrial de Cajamar, com obras previstas para 2026 e 2027.",
    whyItMatters:
      "Um investimento de capital confirmado na manufatura brasileira costuma gerar necessidades de ramp-up, estabilização e prontidão da força de trabalho nos 12–24 meses seguintes.",
    relatedSignalId: "sig-01",
    relatedOpportunityId: "opp-manufacturing",
  },
  {
    id: "clm-02",
    companyId: "co-natura",
    claim: "Estoque cresceu 18% a/a",
    type: "derived",
    confidence: 95,
    sourceIds: ["src-07", "src-06"],
    geography: "Global",
    period: "2025 vs 2024",
    excerpt:
      "Estoques consolidados reportados nas demonstrações financeiras de 2025, comparados ao saldo reapresentado de 2024.",
    whyItMatters:
      "Estoque crescendo materialmente mais rápido que a receita é um precursor comum de pressão de capital de giro e atrito de planejamento.",
    calculation:
      "Estoques 2025 ÷ Estoques 2024 − 1, com valores do balanço consolidado. Crescimento da receita no mesmo período: +6%.",
    relatedSignalId: "sig-03",
    relatedOpportunityId: "opp-working-capital",
  },
  {
    id: "clm-03",
    companyId: "co-natura",
    claim: "Possível pressão de capital de giro",
    type: "hypothesis",
    confidence: 74,
    sourceIds: ["src-07", "src-06", "src-03", "src-11"],
    geography: "Brazil proxy",
    period: "2º sem. 2025 – 2026",
    excerpt:
      "O crescimento de estoque, o comentário da gestão sobre normalização de inventário no canal e a desaceleração do mercado brasileiro de beleza em 2026 apontam na mesma direção, mas não há um número de capital de giro específico do Brasil.",
    whyItMatters:
      "Se confirmado, conecta planejamento, estratégia de estoques e caixa — uma área em que a EFESO Brasil tem histórico de entrega.",
    relatedOpportunityId: "opp-working-capital",
  },
  {
    id: "clm-04",
    companyId: "co-natura",
    claim: "Capacidade atual de fábrica",
    type: "conflict",
    confidence: null,
    sourceIds: ["src-08", "src-09", "src-01"],
    geography: "Brazil",
    period: "2023 – 2025",
    excerpt:
      "As fontes públicas reportam números de capacidade diferentes e irreconciliáveis entre 2023 e 2025.",
    whyItMatters:
      "A capacidade é o denominador de qualquer hipótese quantitativa de produtividade. Sem um número confiável, o Signal a exclui da modelagem.",
    conflictId: "cft-01",
    relatedOpportunityId: "opp-manufacturing",
  },
  {
    id: "clm-05",
    companyId: "co-natura",
    claim: "Gestão anunciou iniciativa de melhoria de margem",
    type: "verified",
    confidence: 93,
    sourceIds: ["src-03", "src-06"],
    geography: "Global",
    period: "Janeiro de 2026",
    excerpt:
      "A gestão descreveu uma iniciativa plurianual de margem bruta e eficiência de SG&A, com as operações da América Latina citadas como prioridade.",
    whyItMatters:
      "Uma agenda explícita de margem sinaliza apetite interno por programas de custo e produtividade.",
    relatedSignalId: "sig-02",
    relatedOpportunityId: "opp-cost",
  },
  {
    id: "clm-06",
    companyId: "co-natura",
    claim: "Expansão de capacidade da ordem de 30% anunciada",
    type: "verified",
    confidence: 88,
    sourceIds: ["src-09", "src-02"],
    geography: "Brazil",
    period: "Setembro de 2024",
    excerpt:
      "A imprensa cita representantes da empresa descrevendo uma expansão planejada de cerca de 30% na capacidade instalada do complexo de Cajamar.",
    whyItMatters:
      "A magnitude da expansão determina a complexidade do ramp-up. A linha de base à qual se aplica é disputada (ver conflito).",
    relatedOpportunityId: "opp-manufacturing",
    conflictId: "cft-01",
  },
  {
    id: "clm-07",
    companyId: "co-natura",
    claim: "Contratações industriais na região de Cajamar aumentaram",
    type: "derived",
    confidence: 81,
    sourceIds: ["src-10"],
    geography: "Brazil",
    period: "1º trim. 2026",
    excerpt:
      "Contagem de vagas industriais públicas (produção, manutenção, qualidade, planejamento) associadas ao site de Cajamar, comparada aos dois trimestres anteriores.",
    whyItMatters:
      "Contratar à frente de um ramp-up sugere necessidades de onboarding e capacitação.",
    calculation:
      "Contagem móvel de 90 dias de vagas industriais associadas ao site; 1º trim. 2026 vs. média do 3º–4º trim. 2025. Fonte única e não primária — tratada apenas como indicativa.",
    relatedOpportunityId: "opp-manufacturing",
  },
  {
    id: "clm-08",
    companyId: "co-natura",
    claim: "Cinco unidades industriais no Brasil",
    type: "verified",
    confidence: 90,
    sourceIds: ["src-05", "src-01"],
    geography: "Brazil",
    period: "2025",
    excerpt:
      "O Formulário de Referência lista as unidades industriais brasileiras da empresa, incluindo Cajamar (SP) e Benevides (PA).",
    whyItMatters:
      "Define o escopo de um eventual programa de manufatura e onde um piloto poderia começar.",
  },
  {
    id: "clm-09",
    companyId: "co-natura",
    claim: "Aproximadamente 4.300 colaboradores nas operações brasileiras",
    type: "verified",
    confidence: 78,
    sourceIds: ["src-05"],
    geography: "Brazil",
    period: "2025",
    excerpt:
      "Quadro de pessoal divulgado por geografia no documento regulatório; a divisão entre manufatura e comercial não é informada.",
    whyItMatters:
      "Indicador de escala para organização e capacitação. A divisão por função é desconhecida.",
  },
  {
    id: "clm-10",
    companyId: "co-natura",
    claim: "Papel de liderança de transformação criado no grupo",
    type: "verified",
    confidence: 92,
    sourceIds: ["src-12"],
    geography: "Global",
    period: "Novembro de 2025",
    excerpt:
      "O grupo anunciou a nomeação de um Chief Transformation Officer com mandato de operações e custo.",
    whyItMatters:
      "Um dono dedicado de transformação é um indicador forte de apetite por programa e um interlocutor natural para a EFESO.",
    relatedSignalId: "sig-04",
  },
  {
    id: "clm-11",
    companyId: "co-natura",
    claim: "O ramp-up pode tensionar a estabilidade operacional em 2026–2027",
    type: "hypothesis",
    confidence: 68,
    sourceIds: ["src-02", "src-09", "src-10"],
    geography: "Brazil",
    period: "2026 – 2027",
    excerpt:
      "Inferido da combinação de um investimento confirmado, uma taxa elevada de expansão e atividade de contratação. Nenhuma informação pública descreve o plano de ramp-up.",
    whyItMatters:
      "Esta é a hipótese central da oportunidade de Ramp-up e produtividade industrial e precisa ser validada com o cliente.",
    relatedOpportunityId: "opp-manufacturing",
  },
  {
    id: "clm-12",
    companyId: "co-natura",
    claim: "Iniciativas digitais de chão de fábrica são uma prioridade atual",
    type: "hypothesis",
    confidence: 41,
    sourceIds: ["src-01"],
    geography: "Global",
    period: "2025",
    excerpt:
      "O relatório anual menciona digitalização em termos gerais; nenhum programa digital específico de manufatura é descrito.",
    whyItMatters:
      "Evidência pública insuficiente. O Signal mantém a oportunidade de Operações digitais em força baixa.",
    relatedOpportunityId: "opp-digital",
  },
  {
    id: "clm-13",
    companyId: "co-natura",
    claim: "Crescimento do mercado brasileiro de beleza deve desacelerar em 2026",
    type: "verified",
    confidence: 84,
    sourceIds: ["src-11"],
    geography: "Brazil",
    period: "Perspectiva 2026",
    excerpt:
      "A associação setorial projeta crescimento real de um dígito baixo para a categoria em 2026, após um 2025 mais forte.",
    whyItMatters:
      "Um mercado mais lento aumenta a importância de custo, produtividade e disciplina de estoque.",
    relatedOpportunityId: "opp-cost",
  },
  {
    id: "clm-14",
    companyId: "co-natura",
    claim: "Margem bruta recuou 1,4 p.p. a/a na América Latina",
    type: "derived",
    confidence: 90,
    sourceIds: ["src-06", "src-07"],
    geography: "Latin America",
    period: "2025",
    excerpt:
      "Margem bruta do segmento reportada na apresentação de resultados, comparada ao ano anterior.",
    whyItMatters:
      "Sustenta a relevância da iniciativa de margem; a margem específica do Brasil não é divulgada.",
    calculation:
      "Margem bruta do segmento América Latina em 2025 menos 2024, conforme reportado. O Brasil é tratado como proxy dentro da América Latina.",
    relatedOpportunityId: "opp-cost",
  },
  {
    id: "clm-15",
    companyId: "co-natura",
    claim: "A contagem de centros de distribuição diverge entre as fontes",
    type: "conflict",
    confidence: null,
    sourceIds: ["src-05", "src-01"],
    geography: "Brazil",
    period: "2025",
    excerpt:
      "O documento regulatório e o relatório anual descrevem a rede logística brasileira com contagens diferentes de centros de distribuição.",
    whyItMatters:
      "Conflito menor. O Signal usa o documento regulatório (2 CDs) e sinaliza o número como demonstração.",
    conflictId: "cft-02",
  },
];

export const conflicts: Conflict[] = [
  {
    id: "cft-01",
    companyId: "co-natura",
    topic: "Capacidade atual de produção",
    claimId: "clm-04",
    positions: [
      {
        sourceId: "src-08",
        label: "Fonte A",
        statement: "2,0 milhões de unidades/ano de capacidade instalada em Cajamar",
        year: "2023",
      },
      {
        sourceId: "src-09",
        label: "Fonte B",
        statement: "Expansão de 30% da capacidade anunciada",
        year: "2024",
      },
      {
        sourceId: "src-01",
        label: "Fonte C",
        statement: "Capacidade instalada atualizada não divulgada",
        year: "2025",
      },
    ],
    conclusion: "A capacidade instalada atual não pode ser determinada com segurança a partir de informação pública.",
    decision: "Excluída da modelagem quantitativa de oportunidades.",
  },
  {
    id: "cft-02",
    companyId: "co-natura",
    topic: "Número de centros de distribuição no Brasil",
    claimId: "clm-15",
    positions: [
      {
        sourceId: "src-05",
        label: "Fonte A",
        statement: "2 centros de distribuição listados",
        year: "2025",
      },
      {
        sourceId: "src-01",
        label: "Fonte B",
        statement: "3 hubs logísticos mencionados",
        year: "2025",
      },
    ],
    conclusion:
      "As definições parecem divergir (centro de distribuição vs. hub logístico). O documento regulatório foi adotado como referência.",
    decision: "Valor do documento regulatório utilizado; materialidade baixa.",
  },
];
