"use client";

import { useState, useTransition } from "react";
import { createPersonLabAction, saveRelationshipLabAction } from "@/server/actions/relationship-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import {
  PERSON_TYPES,
  RELATIONSHIP_SOURCES,
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_STRENGTHS,
} from "@/server/relationship/taxonomy";
import type { AccountRelationshipView, RelationshipPersonView } from "@/server/relationship/types";

const copy = ui.admin.relationshipLab;

export function RelationshipLabForm({
  companies,
  persons,
  current,
}: {
  companies: { id: string; displayName: string }[];
  persons: RelationshipPersonView[];
  current: AccountRelationshipView | null;
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveRelationshipLabAction(formData);
      setMessage(result.ok ? "Gravado." : result.error);
    });
  }

  function createPerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createPersonLabAction(formData);
      setMessage(result.ok ? "Pessoa criada. Recarregue para selecioná-la." : result.error);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {current?.unavailable ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{ui.relationship.unavailable}</p>
      ) : current ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Atual: {current.relationshipStatus} / {current.derivedStrength} / {current.dataQuality}
        </p>
      ) : null}
      <form onSubmit={save} className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-2">
          <Label>{ui.admin.signalLab.company}</Label>
          <select
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>{ui.relationship.status}</Label>
          <select name="relationshipStatus" defaultValue={current?.relationshipStatus ?? "unknown"} className="h-9 rounded-md border bg-background px-3 text-sm">
            {RELATIONSHIP_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>{ui.relationship.strength}</Label>
          <select name="recordedStrength" defaultValue="" className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Derivar dos dados estruturados</option>
            {RELATIONSHIP_STRENGTHS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>{ui.relationship.lastInteraction}</Label>
          <Input name="lastKnownInteractionAt" type="date" />
        </div>
        <div className="grid gap-2">
          <Label>{ui.relationship.source}</Label>
          <select name="sourceType" defaultValue="manual_admin_entry" className="h-9 rounded-md border bg-background px-3 text-sm">
            {RELATIONSHIP_SOURCES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Account owner</Label>
          <select name="accountOwnerPersonId" defaultValue="" className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Responsável interno não identificado</option>
            {persons
              .filter((person) => person.personType === "efeso_internal")
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>{ui.relationship.holders}</Label>
          <select name="holderPersonIds" multiple className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm">
            {persons
              .filter((person) => person.personType === "efeso_internal")
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Summary</Label>
          <Input name="relationshipSummary" />
        </div>
        <Button type="submit" disabled={pending}>
          {copy.submit}
        </Button>
      </form>
      <form onSubmit={createPerson} className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <div className="grid gap-2">
          <Label>Nome de demonstração</Label>
          <Input name="displayName" required />
        </div>
        <div className="grid gap-2">
          <Label>Organização</Label>
          <Input name="organization" required defaultValue="EFESO" />
        </div>
        <div className="grid gap-2">
          <Label>Tipo</Label>
          <select name="personType" className="h-9 rounded-md border bg-background px-3 text-sm">
            {PERSON_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending} variant="outline">
          {copy.personSubmit}
        </Button>
      </form>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
