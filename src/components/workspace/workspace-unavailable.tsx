import Link from "next/link";
import { FileSearch } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { t, ui } from "@/i18n";
import { routes } from "@/lib/routes";
import type { Company } from "@/types";

interface WorkspaceUnavailableProps {
  company: Company;
  section: string;
}

/** Honest empty state for companies without full demo content in this prototype. */
export function WorkspaceUnavailable({ company, section }: WorkspaceUnavailableProps) {
  return (
    <EmptyState
      icon={FileSearch}
      title={t(ui.unavailableWorkspace.title, { section, company: company.name })}
      description={ui.unavailableWorkspace.description}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href={routes.company("natura")}>{ui.unavailableWorkspace.openNatura}</Link>
        </Button>
      }
    />
  );
}
