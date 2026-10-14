import type { Opportunity } from "@/types";

/** Demo data — synthetic and not validated. Ordered by strength. Report-locale content (pt-BR). */
export const opportunities: Opportunity[] = [
  {
    id: "opp-manufacturing",
    companyId: "co-natura",
    shortTitle: "Desempenho industrial",
    title: "Ramp-up e produtividade industrial",
    score: 86,
    efesoFit: "Excellent",
    evidenceStrength: "Strong",
    clientValidation: "Required",
    summary:
      "A expansão confirmada do complexo industrial de Cajamar, combinada a uma agenda explícita de margem no grupo, aponta para uma necessidade de disciplina de ramp-up e ganhos de produtividade na manufatura brasileira no curto prazo.",
    whySignalIdentified: [
      { text: "Investimento industrial no Brasil confirmado", claimId: "clm-01" },
      { text: "Expansão de capacidade anunciada", claimId: "clm-06" },
      { text: "Contratações industriais em alta", claimId: "clm-07" },
      { text: "Gestão priorizando produtividade", claimId: "clm-05" },
    ],
    hypothesis:
      "A expansão pode criar desafios de curto prazo na velocidade de ramp-up, na estabilidade operacional e na prontidão da força de trabalho.",
    capabilityIds: ["cap-manufacturing", "cap-opex", "cap-people-org"],
    unknowns: ["OEE atual", "Curva de ramp-up", "Principais gargalos", "Índice de refugo"],
    recommendedNextStep: "Validar com o cliente",
    discoveryQuestions: [
      "Qual é o OEE atual das novas linhas?",
      "Qual curva de ramp-up foi estabelecida?",
      "Quais perdas estão limitando o atingimento da capacidade planejada?",
    ],
  },
  {
    id: "opp-working-capital",
    companyId: "co-natura",
    shortTitle: "Capital de giro",
    title: "Capital de giro e planejamento",
    score: 81,
    efesoFit: "Strong",
    evidenceStrength: "Moderate",
    clientValidation: "Required",
    summary:
      "O estoque cresceu três vezes mais rápido que a receita em 2025, enquanto a gestão comentou a normalização de inventário no canal. A informação pública sustenta uma conversa de planejamento e estratégia de estoques.",
    whySignalIdentified: [
      { text: "Estoque +18% a/a contra receita +6%", claimId: "clm-02" },
      { text: "Comentário da gestão sobre normalização de inventário", claimId: "clm-03" },
      { text: "Desaceleração esperada do mercado brasileiro de beleza em 2026", claimId: "clm-13" },
    ],
    hypothesis:
      "O crescimento de estoque pode refletir um problema de planejamento e acurácia de forecast em um portfólio complexo de venda direta, e não uma formação deliberada de estoque antes da expansão.",
    capabilityIds: ["cap-supply-chain", "cap-working-capital"],
    unknowns: [
      "Posição de estoque específica do Brasil",
      "Acurácia de forecast por categoria",
      "Maturidade de S&OP",
      "Níveis de obsolescência",
    ],
    recommendedNextStep: "Validar drivers de estoque com finanças e planejamento do cliente",
    discoveryQuestions: [
      "O que explicou o crescimento de estoque em 2025 no Brasil?",
      "Qual é a acurácia de forecast por categoria?",
      "Como está estruturado o S&OP hoje?",
    ],
  },
  {
    id: "opp-cost",
    companyId: "co-natura",
    shortTitle: "Custo e lucratividade",
    title: "Competitividade de custos",
    score: 72,
    efesoFit: "Strong",
    evidenceStrength: "Moderate",
    clientValidation: "Recommended",
    summary:
      "Um programa público de margem e a queda de 1,4 p.p. na margem bruta da América Latina indicam apetite por transparência de custos e trabalho de custo de conversão. Números específicos do Brasil não são divulgados.",
    whySignalIdentified: [
      { text: "Iniciativa de melhoria de margem anunciada", claimId: "clm-05" },
      { text: "Margem bruta da América Latina recuou 1,4 p.p.", claimId: "clm-14" },
      { text: "Papel de liderança de transformação criado", claimId: "clm-10" },
    ],
    hypothesis:
      "O programa de margem pode estar concentrado em SG&A e precificação; o custo de conversão industrial pode ser uma alavanca ainda pouco endereçada.",
    capabilityIds: ["cap-cost", "cap-opex", "cap-procurement"],
    unknowns: [
      "Ponte de margem do Brasil",
      "Escopo e governança do programa",
      "Linha de base do custo de conversão",
    ],
    recommendedNextStep: "Propor um diagnóstico de transparência de custos",
    discoveryQuestions: [
      "Qual é o escopo do programa de margem no Brasil?",
      "Há uma ponte de margem industrial disponível?",
      "O custo de conversão está no radar da gestão?",
    ],
  },
  {
    id: "opp-digital",
    companyId: "co-natura",
    shortTitle: "Operações digitais",
    title: "Operações digitais",
    score: 48,
    efesoFit: "Moderate",
    evidenceStrength: "Insufficient",
    clientValidation: "Required",
    summary:
      "A informação pública menciona digitalização apenas em termos gerais. O Signal não encontrou evidências suficientes de uma agenda digital específica de manufatura e mantém esta oportunidade em força baixa.",
    whySignalIdentified: [
      { text: "Menções genéricas à digitalização no relatório anual", claimId: "clm-12" },
      { text: "O programa de expansão pode incluir novos equipamentos e sistemas", claimId: "clm-01" },
    ],
    hypothesis:
      "O novo investimento industrial pode incluir componentes digitais de chão de fábrica, mas isso não pode ser confirmado com fontes públicas.",
    capabilityIds: ["cap-digital", "cap-opex"],
    unknowns: [
      "Roadmap digital de manufatura",
      "Infraestrutura atual de MES / dados",
      "Dono das operações digitais",
    ],
    recommendedNextStep: "Manter em espera — revisitar após o discovery com o cliente",
    discoveryQuestions: [
      "Existe um roadmap digital específico para manufatura?",
      "Qual é a infraestrutura atual de MES e dados de planta?",
      "Quem é o dono das operações digitais?",
    ],
  },
];
