import type { Metadata } from "next";
import { BookMarked, Boxes, ScrollText, ShieldCheck, Users } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlaceholderGrid, type PlaceholderItem } from "@/components/shared/placeholder-grid";
import { ui } from "@/i18n";

export const metadata: Metadata = { title: ui.admin.title };

const items: PlaceholderItem[] = [
  { icon: Boxes, title: ui.admin.items.capabilities.title, description: ui.admin.items.capabilities.description },
  { icon: ShieldCheck, title: ui.admin.items.sourcePolicies.title, description: ui.admin.items.sourcePolicies.description },
  { icon: Users, title: ui.admin.items.users.title, description: ui.admin.items.users.description },
  { icon: ScrollText, title: ui.admin.items.researchRules.title, description: ui.admin.items.researchRules.description },
  { icon: BookMarked, title: ui.admin.items.cases.title, description: ui.admin.items.cases.description },
];

export default function AdminPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.eyebrow}
        title={ui.admin.headline}
        description={ui.admin.description}
        className="mb-8"
      />
      <PlaceholderGrid items={items} />
      <p className="mt-6 text-sm text-muted-foreground">{ui.admin.notImplemented}</p>
    </PageContainer>
  );
}
