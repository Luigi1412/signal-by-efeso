import type { Metadata } from "next";
import { Award, BarChart3, BookMarked, Boxes, Factory, Layers, Trophy } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlaceholderGrid, type PlaceholderItem } from "@/components/shared/placeholder-grid";
import { ui } from "@/i18n";

export const metadata: Metadata = { title: ui.knowledgeBase.title };

const items: PlaceholderItem[] = [
  { icon: Boxes, title: ui.knowledgeBase.items.capabilities.title, description: ui.knowledgeBase.items.capabilities.description },
  { icon: Layers, title: ui.knowledgeBase.items.methodologies.title, description: ui.knowledgeBase.items.methodologies.description },
  { icon: BookMarked, title: ui.knowledgeBase.items.cases.title, description: ui.knowledgeBase.items.cases.description },
  { icon: BarChart3, title: ui.knowledgeBase.items.benchmarks.title, description: ui.knowledgeBase.items.benchmarks.description },
  { icon: Factory, title: ui.knowledgeBase.items.industries.title, description: ui.knowledgeBase.items.industries.description },
  { icon: Trophy, title: ui.knowledgeBase.items.results.title, description: ui.knowledgeBase.items.results.description },
  { icon: Award, title: ui.knowledgeBase.items.credentials.title, description: ui.knowledgeBase.items.credentials.description },
];

export default function KnowledgeBasePage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.knowledgeBase.title}
        title={ui.knowledgeBase.headline}
        description={ui.knowledgeBase.description}
        className="mb-8"
      />

      <div className="mb-4 text-sm text-muted-foreground">{ui.knowledgeBase.intro}</div>
      <PlaceholderGrid items={items} />

      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">{ui.knowledgeBase.notImplemented}</p>
    </PageContainer>
  );
}
