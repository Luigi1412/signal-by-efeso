"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ResearchLiveSummary, ResearchPhase, ResearchPhaseStatus } from "@/types";

interface UseResearchSimulationOptions {
  initialCompletedCount?: number;
  onPhase?: (phaseIndex: number) => void;
  onComplete?: () => void;
}

interface UseResearchSimulationResult {
  phaseStatuses: ResearchPhaseStatus[];
  activeIndex: number;
  progress: number;
  summary: ResearchLiveSummary;
  complete: boolean;
}

/**
 * Local-only simulation of a disciplined research run.
 * Phases advance sequentially; live counters approach the final summary as progress grows.
 * When a persisted ResearchRun exists, the hook resumes from initialCompletedCount.
 */
export function useResearchSimulation(
  phases: ResearchPhase[],
  finalSummary: ResearchLiveSummary,
  options: UseResearchSimulationOptions = {},
): UseResearchSimulationResult {
  const [completedCount, setCompletedCount] = useState(() =>
    Math.min(options.initialCompletedCount ?? 0, phases.length),
  );
  const [elapsedInPhase, setElapsedInPhase] = useState(0);
  const onPhaseRef = useRef(options.onPhase);
  const onCompleteRef = useRef(options.onComplete);
  const announcedComplete = useRef((options.initialCompletedCount ?? 0) >= phases.length);
  const announcedPhase = useRef<number | null>(null);

  const complete = completedCount >= phases.length;

  useEffect(() => {
    onPhaseRef.current = options.onPhase;
    onCompleteRef.current = options.onComplete;
  }, [options.onPhase, options.onComplete]);

  useEffect(() => {
    if (complete) {
      if (!announcedComplete.current) {
        announcedComplete.current = true;
        onCompleteRef.current?.();
      }
      return;
    }

    if (announcedPhase.current !== completedCount) {
      announcedPhase.current = completedCount;
      onPhaseRef.current?.(completedCount);
    }

    const phase = phases[completedCount];
    const started = performance.now();

    const tick = window.setInterval(() => {
      setElapsedInPhase(Math.min(performance.now() - started, phase.durationMs));
    }, 80);

    const advance = window.setTimeout(() => {
      window.clearInterval(tick);
      setElapsedInPhase(0);
      setCompletedCount((c) => c + 1);
    }, phase.durationMs);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(advance);
    };
  }, [completedCount, complete, phases]);

  const totalDuration = useMemo(() => phases.reduce((sum, p) => sum + p.durationMs, 0), [phases]);

  const elapsedTotal =
    phases.slice(0, completedCount).reduce((sum, p) => sum + p.durationMs, 0) + elapsedInPhase;
  const progress = complete ? 1 : Math.min(elapsedTotal / totalDuration, 1);

  const phaseStatuses: ResearchPhaseStatus[] = phases.map((_, i) =>
    i < completedCount ? "done" : i === completedCount ? "active" : "pending",
  );

  const eased = 1 - Math.pow(1 - progress, 2);
  const scale = (n: number, from = 0) => Math.round(from + (n - from) * eased);

  const summary: ResearchLiveSummary = complete
    ? finalSummary
    : {
        sourcesDiscovered: scale(finalSummary.sourcesDiscovered),
        sourcesRetained: progress > 0.15 ? scale(finalSummary.sourcesRetained) : 0,
        verifiedClaims: progress > 0.3 ? scale(finalSummary.verifiedClaims) : 0,
        emergingOpportunities: progress > 0.65 ? scale(finalSummary.emergingOpportunities) : 0,
        potentialConflicts: progress > 0.85 ? finalSummary.potentialConflicts : 0,
      };

  return {
    phaseStatuses,
    activeIndex: Math.min(completedCount, phases.length - 1),
    progress,
    summary,
    complete,
  };
}
