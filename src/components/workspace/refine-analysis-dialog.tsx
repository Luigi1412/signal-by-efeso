"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crosshair, Factory, FileCheck2, Search, Trash2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type RefineActionId = keyof typeof ui.refine.actions;

interface QuickAction {
  id: RefineActionId;
  icon: LucideIcon;
}

const quickActions: QuickAction[] = [
  { id: "investigate", icon: Crosshair },
  { id: "site", icon: Factory },
  { id: "competitor", icon: Users },
  { id: "primary", icon: FileCheck2 },
  { id: "remove", icon: Trash2 },
  { id: "topic", icon: Search },
];

interface RefineAnalysisDialogProps {
  companySlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RefineAnalysisDialog({ companySlug, open, onOpenChange }: RefineAnalysisDialogProps) {
  const router = useRouter();
  const [instructions, setInstructions] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  function applyQuickAction(action: QuickAction) {
    const prompt = ui.refine.prompts[action.id];
    setSelected(action.id);
    setInstructions((current) => (current.trim() ? `${current.trim()}\n${prompt}` : prompt));
  }

  function handleSubmit() {
    onOpenChange(false);
    setInstructions("");
    setSelected(null);
    router.push(`${routes.companyTab(companySlug, "versions")}?refined=1`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{ui.refine.title}</DialogTitle>
          <DialogDescription>{ui.refine.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={ui.refine.placeholder}
            rows={4}
            className="min-h-28 resize-y text-sm"
            aria-label={ui.refine.title}
          />

          <div>
            <div className="eyebrow mb-2">{ui.refine.quickActions}</div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => applyQuickAction(action)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[13px] font-medium transition-colors outline-none",
                    "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40",
                    selected === action.id ? "border-foreground/40 bg-muted" : "border-border bg-card",
                  )}
                >
                  <action.icon className="size-3.5 shrink-0 text-muted-foreground" />
                  {ui.refine.actions[action.id]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">{ui.refine.hint}</span>
          <Button variant="brand" onClick={handleSubmit}>
            {ui.refine.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
