"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import NextLink from "next/link";
import type * as Research from "@/server/actions/external-research-actions";
import { localPreviewHref } from "@/lib/local-preview";

export interface PreviewActions {
  identify: typeof Research.previewExternalResearchAction;
  start: typeof Research.startExternalResearchAction;
  tick: typeof Research.tickExternalResearchAction;
  resolve: typeof Research.resolveResearchEntityAction;
  cancel: typeof Research.cancelExternalResearchAction;
}

const Context = createContext<PreviewActions | null>(null);
export function LocalPreviewProvider({ actions, children }: { actions: PreviewActions; children: ReactNode }) {
  return <Context.Provider value={actions}>{children}</Context.Provider>;
}
export function useLocalPreview() { return useContext(Context); }

/** The provider only exists under the gated /preview route. Normal links are unchanged. */
export function ScopedLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const preview = useLocalPreview();
  return <NextLink {...props} href={preview && typeof href === "string" ? localPreviewHref(href) : href} prefetch={preview ? false : props.prefetch} />;
}
