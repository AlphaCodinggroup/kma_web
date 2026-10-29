"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogItem, CatalogItemInput, CatalogMutation, CatalogOperation } from "@entities/catalog/model/catalog";
import { Button, Input, Label, Textarea } from "@shared/ui/controls";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@shared/ui/modal";

const fields = [
  ["flow_id", "Flow ID"], ["barrier_id", "Barrier ID"], ["question_code", "Question code"],
  ["question", "Question"], ["mitigation_id", "Mitigation ID"], ["barrier_statement", "Barrier"],
  ["proposed_mitigation", "Mitigation"], ["adas_reference", "Reference"], ["unit", "Unit"],
] as const;
type Props = {
  selected: { kind: CatalogMutation["kind"]; item?: CatalogItem };
  version: string;
  revision: string;
  busy: boolean;
  result: CatalogOperation | null;
  error: string | null;
  onSave: (value: CatalogMutation) => Promise<string | undefined>;
  onClose: () => void;
};

export default function CatalogItemEditor({ selected, version, revision, busy, result, error, onSave, onClose }: Props) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(([key]) => [key, selected.item?.[key] ?? ""])) as Record<typeof fields[number][0], string>);
  const [cost, setCost] = useState(selected.item?.cost == null ? "" : String(selected.item.cost));
  const [base, setBase] = useState({ base_version: version, expected_revision: revision });
  const [submitted, setSubmitted] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (submitted && result?.operation_id === submitted && result.status === "completed") close.current();
  }, [submitted, result]);
  const locked = busy || saving;
  const changed = base.expected_revision !== revision;
  const save = async () => {
    if (locked) return;
    const numeric = cost.trim() === "" ? null : Number(cost);
    if (numeric !== null && (!Number.isFinite(numeric) || numeric < 0)) { setValidation("Cost must be a finite non-negative number, or empty."); return; }
    setValidation(null);
    setSaving(true);
    try {
      const target = selected.item ? { flow_id: selected.item.flow_id ?? "", catalog_item_id: selected.item.catalog_item_id } : undefined;
      const mutation: CatalogMutation = { ...base, kind: selected.kind, ...(target ? { target } : {}), ...(selected.kind !== "delete" ? { item: { ...values, cost: numeric } as CatalogItemInput } : {}) };
      const id = await onSave(mutation);
      if (id) setSubmitted(id);
    } finally { setSaving(false); }
  };
  const notices = <>
    {(validation || error) && <p role="alert" className="text-sm text-[var(--kma-danger)]">{validation ?? error}</p>}
    {changed && <div className="space-y-2 text-sm"><p>The active catalog changed. Review your values before applying them to the current catalog.</p><Button type="button" variant="secondary" fullWidth={false} disabled={locked} onClick={() => setBase({ base_version: version, expected_revision: revision })}>Use current catalog</Button></div>}
    {locked && <p role="status" className="text-sm">Saving catalog change… You can close this dialog to check the operation status or retry safely from the catalog page.</p>}
  </>;
  if (selected.kind === "delete") return <Modal open onOpenChange={open => { if (!open) onClose(); }}><ModalContent className="max-w-md p-6"><ModalHeader><ModalTitle>Delete mitigation?</ModalTitle><ModalDescription>Remove only {selected.item?.question_code ?? selected.item?.catalog_item_id} from the active catalog? Earlier versions retain this record.</ModalDescription></ModalHeader>{notices}<ModalFooter><Button variant="secondary" fullWidth={false} onClick={onClose}>{locked ? "Close" : "Cancel"}</Button><Button variant="destructive" fullWidth={false} disabled={locked || changed} isLoading={locked} onClick={() => void save()}>Delete mitigation</Button></ModalFooter></ModalContent></Modal>;
  return <Modal open onOpenChange={open => { if (!open) onClose(); }}>
    <ModalContent className="max-w-2xl p-6"><ModalHeader><ModalTitle>{selected.kind === "create" ? "Add mitigation" : "Edit mitigation"}</ModalTitle><ModalDescription>Save a new catalog version with this record. Other records with the same mitigation ID are unchanged.</ModalDescription></ModalHeader>
      <form onSubmit={event => { event.preventDefault(); if (!changed) void save(); }} className="space-y-4">
        {notices}
        <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label]) => <div key={key} className={["question", "barrier_statement", "proposed_mitigation"].includes(key) ? "sm:col-span-2" : ""}><Label htmlFor={`edit-${key}`}>{label}</Label>{["question", "barrier_statement", "proposed_mitigation"].includes(key) ? <Textarea id={`edit-${key}`} required={["question", "barrier_statement"].includes(key)} disabled={locked} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} /> : <Input id={`edit-${key}`} required={["flow_id", "barrier_id", "question_code", "adas_reference"].includes(key)} disabled={locked} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} />}</div>)}
          <div><Label htmlFor="edit-cost">Cost</Label><Input id="edit-cost" type="number" min="0" step="any" value={cost} disabled={locked} onChange={event => setCost(event.target.value)} aria-describedby="edit-cost-help" /><p id="edit-cost-help" className="text-xs text-[var(--kma-muted)]">Leave empty if unknown. Zero is a known cost.</p></div>
        </div>
        <ModalFooter><Button type="button" variant="secondary" fullWidth={false} onClick={onClose}>{locked ? "Close" : "Cancel"}</Button><Button type="submit" fullWidth={false} disabled={locked || changed} isLoading={locked}>Save mitigation</Button></ModalFooter>
      </form>
    </ModalContent>
  </Modal>;
}
