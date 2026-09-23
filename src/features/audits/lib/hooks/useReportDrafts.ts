import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import type { UpdateAuditFindingInput } from "@entities/audit/model/audit-review-finding-update";
import { updateAuditFinding } from "@features/audits/lib/usecases/updateAuditFinding";
import { auditReviewDetailKey } from "./useAuditReviewDetail";

/** Lo que el QC edita en la vista previa, tal como está escrito en los campos. */
export type FindingDraft = { quantity: string; notes: string };

const toDraft = (finding: AuditFinding): FindingDraft => ({
  quantity: finding.quantity === null ? "" : String(finding.quantity),
  notes: finding.notes ?? "",
});

const parseQuantity = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
};

/** Qué cambió respecto del hallazgo guardado. */
function diffDraft(original: FindingDraft, draft: FindingDraft) {
  const quantity =
    parseQuantity(draft.quantity) !== parseQuantity(original.quantity) &&
    draft.quantity.trim() !== original.quantity.trim();
  const notes = draft.notes.trim() !== original.notes.trim();
  return { quantity, notes };
}

/**
 * Error de la cantidad. No se puede vaciar (el backend ignora null), y 0 es
 * válido: el backend lo toma como "sin costo".
 */
function validateQuantity(raw: string): string | null {
  const value = parseQuantity(raw);
  if (value === null) return "Enter a quantity";
  if (Number.isNaN(value)) return "Enter a number";
  if (value < 0) return "Quantity can't be negative";
  return null;
}

/**
 * Borradores de la vista previa del reporte, por código de pregunta.
 *
 * Guardar manda un PATCH por hallazgo, de a uno: el backend no tiene carga
 * masiva ni control de concurrencia, y en paralelo se pisan. Los que fallan
 * conservan su borrador.
 */
export function useReportDrafts(auditId: string, findings: readonly AuditFinding[]) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, FindingDraft>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const originals = useMemo(
    () => new Map(findings.map((finding) => [finding.questionCode, toDraft(finding)])),
    [findings]
  );

  const draftOf = useCallback(
    (code: string): FindingDraft =>
      drafts[code] ?? originals.get(code) ?? { quantity: "", notes: "" },
    [drafts, originals]
  );

  const setDraft = useCallback(
    (code: string, patch: Partial<FindingDraft>) => {
      setSaveError(null);
      setDrafts((current) => ({
        ...current,
        [code]: {
          ...(current[code] ?? originals.get(code) ?? { quantity: "", notes: "" }),
          ...patch,
        },
      }));
    },
    [originals]
  );

  const changes = useMemo(() => {
    const list: { code: string; draft: FindingDraft; quantity: boolean; notes: boolean }[] = [];
    for (const [code, draft] of Object.entries(drafts)) {
      const original = originals.get(code);
      if (!original) continue;
      const diff = diffDraft(original, draft);
      if (diff.quantity || diff.notes) list.push({ code, draft, ...diff });
    }
    return list;
  }, [drafts, originals]);

  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const change of changes) {
      const error = change.quantity ? validateQuantity(change.draft.quantity) : null;
      if (error) result[change.code] = error;
    }
    return result;
  }, [changes]);

  const errorOf = useCallback((code: string) => errors[code] ?? null, [errors]);

  /** Costo que se va a imprimir: cantidad × costo unitario mientras se edita. */
  const costOf = useCallback(
    (finding: AuditFinding): number => {
      const draft = drafts[finding.questionCode];
      if (!draft) return finding.calculatedCost ?? 0;
      const quantity = parseQuantity(draft.quantity);
      if (quantity === null || Number.isNaN(quantity)) return finding.calculatedCost ?? 0;
      return quantity > 0 && (finding.unitCost ?? 0) > 0
        ? quantity * (finding.unitCost as number)
        : 0;
    },
    [drafts]
  );

  const discard = useCallback(() => {
    setDrafts({});
    setSaveError(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (changes.length === 0 || Object.keys(errors).length > 0) return false;
    setIsSaving(true);
    setSaveError(null);

    const saved: string[] = [];
    let failure: unknown = null;
    for (const change of changes) {
      const input: UpdateAuditFindingInput = { auditId, questionCode: change.code };
      if (change.quantity) input.quantity = parseQuantity(change.draft.quantity) as number;
      if (change.notes) input.notes = change.draft.notes;
      try {
        await updateAuditFinding(input);
        saved.push(change.code);
      } catch (error) {
        failure = failure ?? error;
      }
    }

    // Se espera la revisión actualizada antes de soltar los borradores, así no
    // reaparecen los valores viejos.
    if (saved.length > 0) {
      await queryClient.invalidateQueries({ queryKey: auditReviewDetailKey(auditId) });
    }
    setDrafts((current) => {
      const next = { ...current };
      for (const code of saved) delete next[code];
      return next;
    });
    setIsSaving(false);

    if (failure) {
      const failed = changes.length - saved.length;
      // Los errores del repositorio son ApiError ({ code, message }), no Error.
      const reason =
        typeof failure === "object" && failure !== null && "message" in failure
          ? String((failure as { message: unknown }).message)
          : "";
      setSaveError(
        `${failed} ${failed === 1 ? "change" : "changes"} could not be saved${reason ? `: ${reason}` : "."}`
      );
      return false;
    }
    return true;
  }, [auditId, changes, errors, queryClient]);

  return {
    draftOf,
    setDraft,
    errorOf,
    costOf,
    isDirty: changes.length > 0,
    hasErrors: Object.keys(errors).length > 0,
    isSaving,
    saveError,
    save,
    discard,
  };
}

export type ReportDrafts = ReturnType<typeof useReportDrafts>;

export default useReportDrafts;
