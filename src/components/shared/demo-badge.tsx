import { Badge } from "@/components/ui/badge";
import { ui } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Demo badge is intentionally a no-op on the client when not marked.
 * Server pages should pass `visible={false}` when DEMO_MODE is off.
 */
export function DemoBadge({ className, visible = false }: { className?: string; visible?: boolean }) {
  if (!visible) return null;
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
