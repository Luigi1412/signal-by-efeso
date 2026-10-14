import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Larger, centered variant for the Home page. */
  align?: "left" | "center";
}

export function PageHeader({ title, description, eyebrow, actions, className, align = "left" }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("min-w-0", align === "center" && "max-w-2xl")}>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            align === "center" ? "text-3xl sm:text-[34px] sm:leading-[1.15]" : "text-2xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn("mt-2 text-muted-foreground", align === "center" ? "text-base" : "max-w-2xl text-sm")}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Standard page container with consistent horizontal and vertical rhythm. */
export function PageContainer({ children, className, width = "default" }: { children: React.ReactNode; className?: string; width?: "default" | "narrow" | "wide" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 py-8 sm:px-8 lg:px-10 lg:py-10",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-6xl",
        width === "wide" && "max-w-[1400px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
