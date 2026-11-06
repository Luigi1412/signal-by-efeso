/**
 * Material movement *leads* — not claims and not signals.
 * Thin/secondary headlines that suggest CAPEX, capacity, M&A, etc. become
 * follow-up discovery targets until an official/primary confirmation is sought.
 */

export interface MovementLead {
  id: string;
  url: string;
  title: string;
  theme: MovementLeadTheme;
  entityHint: string | null;
  locationHint: string | null;
  valueHint: string | null;
  dateHint: string | null;
  sourceQuality: string | null;
  status: "open" | "confirmed" | "exhausted";
}

export type MovementLeadTheme =
  | "capex_expansion"
  | "capacity_production"
  | "acquisition_integration"
  | "restructuring_productivity"
  | "supply_chain_logistics"
  | "other_operational";

const THEME_PATTERNS: Array<{ theme: MovementLeadTheme; pattern: RegExp }> = [
  {
    theme: "capex_expansion",
    pattern:
      /invest(?:irá|mento|ment)|capex|nova f[aá]brica|new (?:plant|factory)|expans[aã]o|expand/i,
  },
  {
    theme: "capacity_production",
    pattern: /capacidade|capacity|produ[cç][aã]o|production|throughput|ramp[- ]?up/i,
  },
  {
    theme: "acquisition_integration",
    pattern: /aquisi[cç]|acquisit|fus[aã]o|merger|integra[cç]|takeover/i,
  },
  {
    theme: "restructuring_productivity",
    pattern: /reestrutur|restructur|produtivid|productivity|cost reduction|redu[cç][aã]o de custo/i,
  },
  {
    theme: "supply_chain_logistics",
    pattern: /supply.?chain|cadeia|log[ií]stic|fornecedor|procurement/i,
  },
];

export function extractMovementLeads(
  items: Array<{
    url: string;
    title?: string | null;
    sourceQuality?: string | null;
    status?: string | null;
    rejectionReason?: string | null;
  }>,
  companyName: string,
): MovementLead[] {
  const leads: MovementLead[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const title = (item.title ?? "").trim();
    if (!title || title.length < 12) continue;
    const theme = detectTheme(`${title} ${item.url}`);
    if (!theme) continue;
    // Social / off-topic noise may still seed a lead, but never as confirmation.
    const key = `${theme}|${normalizeTitleKey(title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    leads.push({
      id: key.slice(0, 120),
      url: item.url,
      title,
      theme,
      entityHint: mentionsCompany(title, companyName) ? companyName : null,
      locationHint: extractLocationHint(title),
      valueHint: extractValueHint(title),
      dateHint: extractYearHint(title),
      sourceQuality: item.sourceQuality ?? null,
      status: "open",
    });
  }
  return leads.slice(0, 12);
}

export function movementLeadFollowUpQueries(
  lead: MovementLead,
  companyName: string,
  officialDomain?: string | null,
): Array<{ query: string; site: string | null }> {
  const name = `"${companyName}"`;
  const loc = lead.locationHint ? `"${lead.locationHint}"` : "";
  const themeTerms: Record<MovementLeadTheme, string> = {
    capex_expansion: "fábrica OR factory OR CapEx OR investimento OR expansão",
    capacity_production: "capacidade OR capacity OR produção OR production",
    acquisition_integration: "aquisição OR acquisition OR fusão OR merger OR integration",
    restructuring_productivity: "reestruturação OR restructuring OR produtividade OR productivity",
    supply_chain_logistics: "supply chain OR logística OR procurement OR fornecedor",
    other_operational: "operações OR operations",
  };
  const queries: Array<{ query: string; site: string | null }> = [
    {
      query: `${name} ${loc} (${themeTerms[lead.theme]}) (release OR comunicado OR RI OR IR OR filing)`.replace(/\s+/g, " ").trim(),
      site: officialDomain ?? null,
    },
    {
      query: `${name} ${loc} (${themeTerms[lead.theme]})`.replace(/\s+/g, " ").trim(),
      site: null,
    },
  ];
  return queries.slice(0, 2);
}

function detectTheme(hay: string): MovementLeadTheme | null {
  for (const row of THEME_PATTERNS) {
    if (row.pattern.test(hay)) return row.theme;
  }
  return null;
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 80);
}

function mentionsCompany(title: string, companyName: string): boolean {
  const token = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/)
    .find((part) => part.length >= 4);
  if (!token) return false;
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .includes(token);
}

function extractLocationHint(title: string): string | null {
  const normalized = title.normalize("NFC");
  // Longer names first so "Rio Grande do Sul" wins over "Rio".
  const states = [
    "Rio Grande do Norte",
    "Rio Grande do Sul",
    "Mato Grosso do Sul",
    "Mato Grosso",
    "Minas Gerais",
    "Espírito Santo",
    "Distrito Federal",
    "Santa Catarina",
    "Rio de Janeiro",
    "São Paulo",
    "Paraná",
    "Paraíba",
    "Pernambuco",
    "Tocantins",
    "Rondônia",
    "Maranhão",
    "Alagoas",
    "Sergipe",
    "Roraima",
    "Amapá",
    "Goiás",
    "Bahia",
    "Ceará",
    "Piauí",
    "Pará",
    "Acre",
    "Amazonas",
  ];
  const lower = normalized.toLowerCase();
  for (const state of states) {
    if (lower.includes(state.toLowerCase())) return state;
  }
  return (
    normalized.match(/\bno\s+([A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ]+)?)/)?.[1] ??
    normalized.match(/\bem\s+([A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ]+)?)/)?.[1] ??
    null
  );
}

function extractValueHint(title: string): string | null {
  return (
    title.match(/R\$\s*[\d.,]+\s*(?:milh[oõ]es|bilh[oõ]es)?/i)?.[0] ??
    title.match(/US\$\s*[\d.,]+\s*(?:million|billion)?/i)?.[0] ??
    title.match(/€\s*[\d.,]+\s*(?:million|billion|milh[oõ]es)?/i)?.[0] ??
    null
  );
}

function extractYearHint(title: string): string | null {
  return title.match(/\b(20[12]\d)\b/)?.[1] ?? null;
}
