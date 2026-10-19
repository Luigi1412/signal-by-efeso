import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RelationshipLabForm } from "@/components/admin/relationship-lab-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ui } from "@/i18n";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { getActionLabContext } from "@/server/services/recommended-action-extraction-service";
import { getCompanyRelationship, listRelationshipPersons } from "@/server/services/relationship-query-service";

export const metadata: Metadata = { title: ui.admin.relationshipLab.title };
export const dynamic = "force-dynamic";

export default async function RelationshipLabPage() {
  if (!isControlledExtractionEnabled()) notFound();
  const context = await getActionLabContext();
  const persons = await listRelationshipPersons();
  const firstCompanyId = context.companies[0]?.id;
  const current = firstCompanyId ? await getCompanyRelationship(firstCompanyId) : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={ui.admin.relationshipLab.eyebrow}
        title={ui.admin.relationshipLab.headline}
        description={ui.admin.relationshipLab.description}
        className="mb-8"
      />
      <RelationshipLabForm companies={context.companies} persons={persons} current={current} />
    </PageContainer>
  );
}
