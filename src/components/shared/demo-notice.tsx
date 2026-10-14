import { Info } from "lucide-react";
import { ui } from "@/i18n";
import { cn } from "@/lib/utils";

interface DemoNoticeProps {
  className?: string;
  /** Short inline variant for section corners. */
  inline?: boolean;
}

/** Discreet reminder that all content is synthetic. */
export function DemoNotice({ className, inline = false }: DemoNoticeProps) {
  if (inline) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Info className="size-3" />
        {ui.demo.notice}
      </span>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <Info className="size-3.5 shrink-0" />
      <span>{ui.demo.notice}</span>
    </div>
  );
}
