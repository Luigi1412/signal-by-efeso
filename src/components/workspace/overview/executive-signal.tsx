import { DemoNotice } from "@/components/shared/demo-notice";
import { SectionHeading } from "@/components/shared/section-heading";
import { ui } from "@/i18n";
import type { ExecutiveSignalContent } from "@/types";

interface ExecutiveSignalProps {
  content: ExecutiveSignalContent;
}

export function ExecutiveSignal({ content }: ExecutiveSignalProps) {
  return (
    <section>
      <SectionHeading
        eyebrow={ui.overview.executiveEyebrow}
        title={ui.overview.executiveTitle}
        actions={<DemoNotice inline />}
        className="mb-4"
      />
      <div className="rounded-lg border bg-card p-6 sm:p-7">
        <SignalBlock label={ui.overview.known} text={content.known} lead />
        <div className="mt-5 flex flex-col gap-5 border-t pt-5">
          <SignalBlock label={ui.overview.meaning} text={content.meaning} />
          <SignalBlock label={ui.overview.toValidate} text={content.toValidate} />
        </div>
      </div>
    </section>
  );
}

function SignalBlock({ label, text, lead = false }: { label: string; text: string; lead?: boolean }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      <p
        className={
          lead
            ? "text-[17px] leading-[1.6] font-medium tracking-[-0.005em] text-foreground"
            : "text-[15px] leading-[1.65] text-muted-foreground"
        }
      >
        {text}
      </p>
    </div>
  );
}
