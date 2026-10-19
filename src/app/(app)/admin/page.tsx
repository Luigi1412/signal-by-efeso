import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { OpenAiStatusBanner } from "@/components/admin/openai-status-banner";
import { ui } from "@/i18n";
import { SIGNAL_PRODUCT_VERSION } from "@/lib/product-version";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: ui.admin.title };

const labs = [
  { href: routes.extractionLab, title: ui.admin.extractionLab.title, description: ui.admin.extractionLab.description },
  { href: routes.knowledgeLab, title: ui.admin.knowledgeLab.title, description: ui.admin.knowledgeLab.description },
  { href: routes.signalLab, title: ui.admin.signalLab.title, description: ui.admin.signalLab.description },
  { href: routes.accountIntelligenceLab, title: ui.admin.accountIntelligenceLab.title, description: ui.admin.accountIntelligenceLab.description },
  { href: routes.efesoFitLab, title: ui.admin.efesoFitLab.title, description: ui.admin.efesoFitLab.description },
  { href: routes.opportunityLab, title: ui.admin.opportunityLab.title, description: ui.admin.opportunityLab.description },
  { href: routes.relationshipLab, title: ui.admin.relationshipLab.title, description: ui.admin.relationshipLab.description },
  { href: routes.actionLab, title: ui.admin.actionLab.title, description: ui.admin.actionLab.description },
  { href: routes.researchLab, title: ui.admin.researchLab.title, description: ui.admin.researchLab.description },
] as const;

export default function AdminPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.eyebrow}
        title={ui.admin.headline}
        description={ui.admin.description}
        className="mb-8"
      />
      <div className="mb-8 flex flex-col gap-3">
        <OpenAiStatusBanner />
        <Link href={routes.releaseHealth} className="text-sm underline-offset-4 hover:underline">
          {ui.admin.releaseHealth.link}
        </Link>
        <p className="text-xs text-muted-foreground">
          {ui.admin.version} {SIGNAL_PRODUCT_VERSION}
        </p>
      </div>
      <section>
        <h2 className="text-lg font-semibold">{ui.admin.labsTitle}</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-muted-foreground">{ui.admin.labsDescription}</p>
        <ul className="grid gap-4 md:grid-cols-2">
          {labs.map((lab) => (
            <li key={lab.href} className="rounded-lg border bg-card p-4">
              <Link href={lab.href} className="text-sm font-medium underline-offset-4 hover:underline">
                {lab.title}
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">{lab.description}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-8 text-sm text-muted-foreground">{ui.admin.notImplemented}</p>
    </PageContainer>
  );
}
