import { cn } from "@/lib/utils";

interface KeyValueProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** Label-over-value pair used in metadata strips and drawers. */
export function KeyValue({ label, children, className }: KeyValueProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="eyebrow">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
