import type { Capability } from "@/types";

/** EFESO Brazil capabilities referenced by opportunities. Demo data. */
export const capabilities: Capability[] = [
  {
    id: "cap-manufacturing",
    name: "Manufatura",
    practice: "Operations",
    description:
      "Desempenho de planta, gestão de ramp-up, melhoria de OEE e otimização do footprint industrial.",
  },
  {
    id: "cap-opex",
    name: "Excelência operacional",
    practice: "Operations",
    description:
      "Sistemas lean, rotinas de gestão de desempenho, resolução de problemas e capacitação de chão de fábrica.",
  },
  {
    id: "cap-people-org",
    name: "Pessoas e Organização",
    practice: "Transformation",
    description:
      "Prontidão da força de trabalho, desenho organizacional, rotinas de liderança e gestão de mudança.",
  },
  {
    id: "cap-supply-chain",
    name: "Supply Chain",
    practice: "Operations",
    description:
      "Planejamento integrado (S&OP/IBP), estratégia de estoques, desenho de rede e desempenho logístico.",
  },
  {
    id: "cap-working-capital",
    name: "Capital de giro",
    practice: "Finance & Performance",
    description:
      "Otimização de estoques, recebíveis e pagáveis conectada aos drivers operacionais.",
  },
  {
    id: "cap-cost",
    name: "Custo e lucratividade",
    practice: "Finance & Performance",
    description:
      "Transparência de custos, lucratividade de produto e canal, programas de SG&A e custo de conversão.",
  },
  {
    id: "cap-procurement",
    name: "Compras",
    practice: "Operations",
    description:
      "Estratégias de categoria, desenvolvimento de fornecedores e suporte a negociação com should-cost.",
  },
  {
    id: "cap-digital",
    name: "Operações digitais",
    practice: "Digital & AI",
    description:
      "Chão de fábrica digital, gestão de desempenho baseada em dados e automação seletiva.",
  },
];
