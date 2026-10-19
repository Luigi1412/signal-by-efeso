import Link from "next/link";
import { ui } from "@/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

interface BrandProps {
  size?: "sm" | "lg";
  href?: string | null;
  className?: string;
}

/** "Signal / by EFESO" wordmark. EFESO stays secondary by design. */
export function Brand({ size = "sm", href = routes.companies, className }: BrandProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "relative flex items-center justify-center rounded-[5px] bg-foreground",
          size === "lg" ? "size-8" : "size-6",
        )}
      >
        <span
          className={cn(
            "absolute rounded-full bg-brand",
            size === "lg" ? "size-2.5" : "size-[7px]",
          )}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-semibold tracking-tight text-foreground", size === "lg" ? "text-xl" : "text-[15px]")}>
          {ui.brand.product}
        </span>
        <span
          className={cn(
            "mt-1 font-medium tracking-[0.02em] text-muted-foreground",
            size === "lg" ? "text-xs" : "text-[10.5px]",
          )}
        >
          {ui.brand.signature}
        </span>
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
      {content}
    </Link>
  );
}
