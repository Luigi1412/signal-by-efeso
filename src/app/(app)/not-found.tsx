import Link from "next/link";
import { SearchX } from "lucide-react";
import { PageContainer } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <PageContainer width="narrow" className="pt-20">
      <EmptyState
        icon={SearchX}
        title={ui.notFound.title}
        description={ui.notFound.description}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={routes.home}>{ui.notFound.back}</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
