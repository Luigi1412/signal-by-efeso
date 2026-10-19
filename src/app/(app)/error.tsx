"use client";

import { PageContainer } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageContainer width="narrow" className="pt-20">
      <EmptyState
        title={ui.errors.title}
        description={ui.errors.body}
        action={
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            {ui.errors.retry}
          </Button>
        }
      />
    </PageContainer>
  );
}
