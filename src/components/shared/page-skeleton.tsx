import { cn } from "@/lib/utils";

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10", className)} aria-busy="true" aria-live="polite">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 max-w-xl animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-28 animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-28 animate-pulse rounded-lg border bg-muted/40" />
      </div>
    </div>
  );
}
