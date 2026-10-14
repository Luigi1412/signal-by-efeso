import type { LucideIcon } from "lucide-react";
import { ui } from "@/i18n";
import { StatusBadge } from "./status-badge";

export interface PlaceholderItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface PlaceholderGridProps {
  items: PlaceholderItem[];
}

/** Restrained grid for "coming in a future iteration" areas. */
export function PlaceholderGrid({ items }: PlaceholderGridProps) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.title} className="flex flex-col gap-3 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex size-8 items-center justify-center rounded-md border bg-background">
              <item.icon className="size-4 text-muted-foreground" />
            </div>
            <StatusBadge tone="neutral" dot={false} size="sm">
              {ui.common.planned}
            </StatusBadge>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
