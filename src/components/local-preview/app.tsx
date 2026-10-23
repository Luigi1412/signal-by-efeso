"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { CompaniesHistory } from "@/components/companies/companies-history";
import { NewResearchForm } from "@/components/research/new-research-form";
import { ExternalResearchProgress } from "@/components/research/external-research-progress";
import { CompanyReport } from "@/components/workspace/company-report";
import { CompanyWorkspaceHeader } from "@/components/workspace/company-workspace-header";
import { AccountDetails } from "@/components/account/account-details";
import { AdminOverview } from "@/components/admin/admin-overview";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { RESEARCH_PHASES, type ExternalResearchStatus } from "@/server/external-research/types";
import { LocalPreviewProvider, ScopedLink as Link } from "./runtime";
import { createPreviewSession, previewCompanyHistory, previewExcerpts, previewScenario, previewUser, scenarioSlugs, type ScenarioSlug } from "./fixtures";

const reportLinks = [
  { slug: "horizonte-industrial", label: "Com movimento, Fit e oportunidade" },
  { slug: "verde-papel", label: "Somente fatos" },
  { slug: "oficina-delta", label: "Evidência insuficiente" },
];
const phaseOptions: { value: ExternalResearchStatus; label: string }[] = [
  ...RESEARCH_PHASES.map(phase => ({ value: phase.status, label: ui.externalResearch.phases[phase.labelKey] })),
  { value: "needs_user_resolution", label: "Aguardando confirmação da empresa" },
  { value: "completed", label: "Concluída" }, { value: "failed", label: "Falha" }, { value: "cancelled", label: "Cancelada" },
];

function ResolutionPreview() {
  const examples = [
    { query: "Orion", label: "Identificada" }, { query: "Horizonte", label: "Já pesquisada" },
    { query: "Atlas", label: "Ambígua" }, { query: "Sem cadastro", label: "Não identificada" },
  ];
  const [query, setQuery] = useState("Orion");
  return <PageContainer width="narrow">
    <PageHeader title={ui.newAnalysis.headline} description={ui.newAnalysis.description} className="mb-8" />
    <fieldset className="mb-8 rounded-md border border-dashed p-3">
      <legend className="px-1 text-xs font-medium">PREVIEW LOCAL · escolher estado da identificação</legend>
      <div className="flex flex-wrap gap-2">{examples.map(example => <Button key={example.query} variant={query === example.query ? "secondary" : "outline"} size="sm" onClick={() => setQuery(example.query)}>{example.label}</Button>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">Clique em pesquisar no formulário atual para ver a confirmação. Qualquer nome digitado é tratado somente como entrada visual; não gera pesquisa real.</p>
    </fieldset>
    <NewResearchForm key={query} initialCompanyName={query} />
  </PageContainer>;
}

export function LocalPreviewApp({ path, phase }: { path: string[]; phase?: string }) {
  const route = path[0] ?? "companies";
  const slug = scenarioSlugs.find(value => path[1] === value || path[1] === `preview-local-${value}`) ?? "horizonte-industrial";
  const initialPhase = phaseOptions.find(option => option.value === phase)?.value ?? "extracting_claims";
  const [session] = useState(() => createPreviewSession(slug, initialPhase));
  const [view, setView] = useState(session.initial);
  const scenario = previewScenario(slug);
  let content: React.ReactNode;

  if (route === "companies" && !path[1]) {
    content = <PageContainer>
      <PageHeader title={ui.companies.title} description={ui.companies.description} className="mb-8" actions={<Button asChild variant="brand"><Link href="/research/new">{ui.companies.newResearch}</Link></Button>} />
      <CompaniesHistory rows={previewCompanyHistory()} />
    </PageContainer>;
  } else if (route === "companies" && scenarioSlugs.includes(path[1] as ScenarioSlug)) {
    content = <>
      <CompanyWorkspaceHeader company={scenario.company} outcomeLabel={scenario.briefing.outcomeTitle} statusLabel="Concluída · cenário ilustrativo" researchGeography="Brasil" corporateCountry="Brasil" lastResearchedAtLabel="01/10/2026 · fixture" />
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10"><CompanyReport slug={slug} briefing={scenario.briefing} sources={scenario.sources} history={[scenario.run]} /></div>
    </>;
  } else if (route === "research" && path[1] === "new") {
    content = <ResolutionPreview />;
  } else if (route === "research" && path[1]?.startsWith("preview-local-")) {
    content = <PageContainer>
      <fieldset className="mb-8 flex flex-wrap items-center gap-3 rounded-md border border-dashed p-3">
        <Label htmlFor="preview-phase">PREVIEW LOCAL · fase ilustrativa</Label>
        <select id="preview-phase" value={view.status} onChange={event => setView(session.setPhase(event.target.value as ExternalResearchStatus))} className="h-9 max-w-full rounded-md border bg-background px-2 text-sm">
          {phaseOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={() => {
          const index = phaseOptions.findIndex(option => option.value === view.status);
          setView(session.setPhase(phaseOptions[(index + 1) % phaseOptions.length]!.value));
        }}>Próxima fase ilustrativa</Button>
        <p className="w-full text-xs text-muted-foreground">Nenhum worker está em execução. As fases e contagens são fixtures; não medem qualidade ou performance.</p>
      </fieldset>
      <ExternalResearchProgress key={view.status} initial={view} />
    </PageContainer>;
  } else if (route === "account") {
    content = <AccountDetails rows={[
      { label: ui.accountPage.name, value: previewUser.name }, { label: ui.accountPage.email, value: "pessoa@preview.invalid" },
      { label: ui.accountPage.role, value: "Membro · ilustrativo" }, { label: ui.accountPage.organization, value: "PREVIEW LOCAL" },
      { label: ui.accountPage.domain, value: "preview.invalid" }, { label: ui.accountPage.status, value: "Perfil ilustrativo, sem sessão autenticada" }, { label: ui.accountPage.loginMethod, value: "Não se aplica ao preview local" },
    ]} />;
  } else if (route === "admin" && !path[1]) {
    content = <AdminOverview statusBanner={<p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">PREVIEW LOCAL · perfil admin ilustrativo. Nenhuma credencial ou serviço real está disponível nesta tela.</p>} />;
  } else if (route === "admin") {
    content = <PageContainer><PageHeader title="Admin · PREVIEW LOCAL" description="Este preview permite inspecionar a navegação administrativa existente. Operações dos laboratórios e checks reais de release permanecem desativados." className="mb-8" /><EmptyState title="Ferramenta operacional indisponível no preview visual" /><Link href="/admin" className="text-sm underline">Voltar à administração</Link></PageContainer>;
  } else if (route === "sources" && path[1] && previewExcerpts[path[1]]) {
    content = <PageContainer width="narrow"><PageHeader title="Documento fictício · PREVIEW LOCAL" description="Esta citação existe apenas em memória para inspecionar a rastreabilidade visual. Não é uma fonte pública real." className="mb-8" /><blockquote className="border-l-2 pl-4 text-sm leading-relaxed">{previewExcerpts[path[1]]}</blockquote></PageContainer>;
  } else {
    content = <PageContainer><EmptyState title="Tela não disponível no preview local" /><Link href="/companies" className="text-sm underline">Voltar às empresas ilustrativas</Link></PageContainer>;
  }

  return <LocalPreviewProvider actions={session.actions}>
    <div className="sticky top-0 z-40 border-b bg-hypothesis-muted px-4 py-3 text-sm" role="note" aria-label="Aviso de preview local">
      <strong>PREVIEW LOCAL</strong> · Todos os dados são fictícios. Sem login, banco, pesquisa, modelo ou validação de qualidade real.
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {reportLinks.map(item => <Link key={item.slug} href={`/companies/${item.slug}`} className="underline">{item.label}</Link>)}
        <Link href="/research/preview-local-horizonte-industrial" className="underline">Progresso ilustrativo</Link>
        <Link href="/admin" className="underline">Admin ilustrativo</Link>
      </div>
    </div>
    <AppShell user={previewUser} showAdminNav={route === "admin"}>{content}</AppShell>
  </LocalPreviewProvider>;
}
