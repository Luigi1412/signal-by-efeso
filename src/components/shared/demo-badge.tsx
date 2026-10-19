import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal text-muted-foreground", className)}
      title={ui.demo.tooltip}
    >
      {ui.demo.badge}
    </Badge>
  );
}
