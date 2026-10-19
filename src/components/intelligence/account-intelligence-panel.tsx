"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyValue } from "@/components/shared/key-value";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DemoBadge } from "@/components/shared/demo-badge";
import { ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { opportunityLevelLabel } from "@/lib/opportunity-display";
import { formatSignalTitleForDisplay } from "@/lib/signal-display";
import { routes } from "@/lib/routes";
import type { AccountIntelligenceView } from "@/server/intelligence/types";
import type { SignalDetail } from "@/server/signals/types";

const copy = ui.accountIntelligence;

interface AccountIntelligencePanelProps {
  intelligence: AccountIntelligenceView;
  selectedSignal: SignalDetail | null;
}

export function AccountIntelligencePanel({ intelligence, selectedSignal }: AccountIntelligencePanelProps) {
  const [open, setOpen] = useState(Boolean(selectedSignal));
  const [focus, setFocus] = useState<string | null>(selectedSignal?.id ?? null);

  const cards = [
    { key: "change", title: copy.whatIsChanging, body: intelligence.changeSummary ?? intelligence.operatingContextSummary },
    { key: "strategy", title: copy.strategicPriorities, body: intelligence.strategicDirection ?? intelligence.sections.strategic_priorities },
    { key: "pressures", title: copy.pressures, body: intelligence.pressureSummary ?? intelligence.sections.operational_pressures },
    { key: "investments", title: copy.investments, body: intelligence.investmentSummary ?? intelligence.sections.investments_and_expansion },
    { key: "risks", title: copy.risks, body: intelligence.riskSummary ?? intelligence.sections.risk_and_constraints },
    { key: "unresolved", title: copy.unresolved, body: intelligence.sections.unresolved_questions },
  ].filter((card) => Boolean(card.body?.trim()));

  return (
    <div className="flex flex-col gap-6">
      <article className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{intelligence.headline}</h2>
          {intelligence.demoOrigin ? <DemoBadge /> : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed">{intelligence.executiveSummary}</p>
        <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <KeyValue label={copy.generated}>{formatDate(intelligence.generatedAt)}</KeyValue>
          <KeyValue label={copy.signalsUsed}>{String(intelligence.signals.length)}</KeyValue>
        </dl>
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.key} className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
          </article>
        ))}
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium">{copy.recurringThemes}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {intelligence.themes.map((theme) => (
            <article key={`${theme.category}:${theme.canonicalName}`} className="rounded-md border px-3 py-2">
              <p className="text-sm font-medium">{theme.canonicalName}</p>
              <p className="text-xs text-muted-foreground">
                {copy.signalCount}: {theme.signalCount} · {opportunityLevelLabel(theme.weightedImportance)}
                {theme.lastSeenAt ? ` · ${copy.lastSeen} ${formatDate(theme.lastSeenAt)}` : ""}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium" title={copy.tensionNote}>
          {copy.tensions}
        </h3>
        <div className="mt-3 flex flex-col gap-3">
          {intelligence.tensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            intelligence.tensions.map((tension) => (
              <article key={tension.id} className="rounded-md border px-3 py-2">
                <p className="text-sm font-medium">{tension.tensionType}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tension.explanation}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tension.signalATitle} · {tension.signalBTitle}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium">{copy.signalsUsed}</h3>
        <ul className="mt-3 space-y-2">
          {intelligence.signals.map((signal) => (
            <li key={signal.id}>
              <button
                type="button"
                className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40"
                onClick={() => {
                  setFocus(signal.id);
                  setOpen(true);
                }}
              >
                <span className="font-medium">{formatSignalTitleForDisplay(signal.title)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {(ui.signalType as Record<string, string>)[signal.signalType] ?? signal.signalType}
                  {" · "}
                  {(ui.assertionMode as Record<string, string>)[signal.assertionMode] ?? signal.assertionMode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{ui.common.viewProvenance}</SheetTitle>
            <SheetDescription>{copy.humanGoverned}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <p>
              {copy.headline} → {ui.nav.signals}
              {focus ? ` → ${intelligence.signals.find((signal) => signal.id === focus)?.title ?? focus}` : ""}
            </p>
            {selectedSignal && selectedSignal.id === focus ? (
              <>
                {selectedSignal.claims.map((claim) => (
                  <article key={claim.id} className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{ui.signals.claims}</p>
                    <p className="mt-1">{claim.statement}</p>
                  </article>
                ))}
                {selectedSignal.evidence.map((item, index) => (
                  <article key={`${item.snapshotId}-${index}`} className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{ui.signals.evidence}</p>
                    <p className="mt-1 text-muted-foreground">“{item.exactQuote}”</p>
                  </article>
                ))}
              </>
            ) : null}
            {focus ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`${routes.companyTab(intelligence.companySlug, "signals")}?signal=${encodeURIComponent(focus)}`}>
                  {copy.openSignal}
                </Link>
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
