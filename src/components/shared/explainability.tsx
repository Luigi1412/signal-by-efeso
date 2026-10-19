import { ui } from "@/i18n";

export function WhyExists({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium">{ui.common.whyExists}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {reasons.slice(0, 5).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </details>
  );
}
