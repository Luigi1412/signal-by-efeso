import type { Company, RecentAnalysis } from "@/types";

/** Demo data — synthetic and not validated. Display copy follows the report locale (pt-BR). */
export const companies: Company[] = [
  {
    id: "co-natura",
    slug: "natura",
    name: "Natura",
    legalName: "Natura Cosméticos S.A.",
    industry: "Consumo e Beleza",
    country: "Brasil",
    headquarters: "São Paulo, Brasil",
    website: "natura.com.br",
    parentGroup: "Natura &Co",
    brazilRelevance: "high",
    description:
      "Empresa brasileira de cosméticos, fragrâncias e cuidados pessoais, com rede de venda direta e um parque industrial integrado no Brasil.",
  },
  {
    id: "co-vale",
    slug: "vale",
    name: "Vale",
    legalName: "Vale S.A.",
    industry: "Mineração",
    country: "Brasil",
    headquarters: "Rio de Janeiro, Brasil",
    website: "vale.com",
    brazilRelevance: "high",
    description:
      "Produtora global de minério de ferro e metais básicos, com sede no Brasil e operações integradas de mina, ferrovia e porto.",
  },
  {
    id: "co-raizen",
    slug: "raizen",
    name: "Raízen",
    legalName: "Raízen S.A.",
    industry: "Energia e Agronegócio",
    country: "Brasil",
    headquarters: "São Paulo, Brasil",
    website: "raizen.com.br",
    parentGroup: "Joint venture Cosan / Shell",
    brazilRelevance: "high",
    description:
      "Empresa integrada de bioenergia que produz açúcar, etanol e energia renovável, com distribuição de combustíveis no Brasil e na Argentina.",
  },
  {
    id: "co-umicore",
    slug: "umicore",
    name: "Umicore",
    legalName: "Umicore N.V.",
    industry: "Materiais avançados",
    country: "Bélgica",
    headquarters: "Bruxelas, Bélgica",
    website: "umicore.com",
    brazilRelevance: "medium",
    description:
      "Grupo de tecnologia de materiais e reciclagem, com produção de catalisadores e materiais especiais, incluindo operações industriais no Brasil.",
  },
];

export const recentAnalyses: RecentAnalysis[] = [
  {
    companyId: "co-natura",
    status: "ready",
    opportunitiesCount: 4,
    lastUpdatedLabel: "há 2 horas",
    lastUpdatedAt: "2026-10-14T11:00:00-03:00",
  },
  {
    companyId: "co-vale",
    status: "ready",
    opportunitiesCount: 6,
    lastUpdatedLabel: "ontem",
    lastUpdatedAt: "2026-10-13T16:20:00-03:00",
  },
  {
    companyId: "co-raizen",
    status: "researching",
    opportunitiesCount: null,
    lastUpdatedLabel: "há 4 minutos",
    lastUpdatedAt: "2026-10-14T13:53:00-03:00",
  },
  {
    companyId: "co-umicore",
    status: "needs-review",
    opportunitiesCount: 3,
    lastUpdatedLabel: "há 3 dias",
    lastUpdatedAt: "2026-10-11T09:10:00-03:00",
  },
];

export const homeMetrics = [
  { value: "12", key: "companies" },
  { value: "47", key: "opportunities" },
  { value: "3", key: "review" },
] as const;
