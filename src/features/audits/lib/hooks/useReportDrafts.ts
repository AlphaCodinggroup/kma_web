import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import type { UpdateAuditFindingInput } from "@entities/audit/model/audit-review-finding-update";
import { updateAuditFinding } from "@features/audits/lib/usecases/updateAuditFinding";
import { auditReviewDetailKey } from "./useAuditReviewDetail";

/**
 * Lo que el QC edita en la vista previa, tal como está escrito en los campos.
 * `measurements` lleva un texto por medición, en el orden del hallazgo.
 */
export type FindingDraft = {
  quantity: string;
  notes: string;
  measurements: string[];
};

const EMPTY_DRAFT: FindingDraft = { quantity: "", notes: "", measurements: [] };

const toDraft = (finding: AuditFinding): FindingDraft => ({
  quantity: finding.quantity === null ? "" : String(finding.quantity),
  notes: finding.notes ?? "",
  measurements: finding.measurements.map((measurement) => String(measurement.value)),
});

const parseQuantity = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
};

/** Qué medidas cambiaron, por posición. */
function changedMeasurements(original: FindingDraft, draft: FindingDraft): number[] {
  const changed: number[] = [];
  draft.measurements.forEach((raw, index) => {
    const saved = original.measurements[index] ?? "";
    if (raw.trim() !== saved.trim() && parseQuantity(raw) !== parseQuantity(saved)) {
      changed.push(index);
    }
  });
  return changed;
}

/** Qué cambió respecto del hallazgo guardado. */
function diffDraft(original: FindingDraft, draft: FindingDraft) {
  const quantity =
    parseQuantity(draft.quantity) !== parseQuantity(original.quantity) &&
    draft.quantity.trim() !== original.quantity.trim();
  const notes = draft.notes.trim() !== original.notes.trim();
  const measurements = changedMeasurements(original, draft);
  return { quantity, notes, measurements };
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
 * Error de una medición: el backend pide un número finito de 0 o más, y no
 * hay forma de vaciarla.
 */
function validateMeasurement(raw: string): string | null {
  const value = parseQuantity(raw);
  if (value === null) return "Enter a measurement";
  if (Number.isNaN(value)) return "Enter a number";
  if (value < 0) return "Measurement can't be negative";
  return null;
}

type Change = {
  key: string;
  finding: AuditFinding;
  draft: FindingDraft;
  quantity: boolean;
  notes: boolean;
  measurements: number[];
};

/**
 * Borradores de la vista previa del reporte, por hallazgo.
 *
 * La clave de un hallazgo es su código de pregunta. Sólo cuando dos hallazgos
 * comparten código (dos variantes de catálogo) se le suma el id de mitigación,
 * que además viaja al backend para que sepa cuál editar.
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

  const sharedCodes = useMemo(() => {
    const seen = new Set<string>();
    const shared = new Set<string>();
    for (const finding of findings) {
      if (seen.has(finding.questionCode)) shared.add(finding.questionCode);
      seen.add(finding.questionCode);
    }
    return shared;
  }, [findings]);

  const keyOf = useCallback(
    (finding: Pick<AuditFinding, "questionCode" | "mitigationId">): string =>
      sharedCodes.has(finding.questionCode) && finding.mitigationId
        ? `${finding.questionCode}#${finding.mitigationId}`
        : finding.questionCode,
    [sharedCodes]
  );

  const byKey = useMemo(
    () => new Map(findings.map((finding) => [keyOf(finding), finding])),
    [findings, keyOf]
  );

  const originals = useMemo(
    () => new Map(findings.map((finding) => [keyOf(finding), toDraft(finding)])),
    [findings, keyOf]
  );

  const draftOf = useCallback(
    (key: string): FindingDraft => drafts[key] ?? originals.get(key) ?? EMPTY_DRAFT,
    [drafts, originals]
  );

  const setDraft = useCallback(
    (key: string, patch: Partial<FindingDraft>) => {
      setSaveError(null);
      setDrafts((current) => ({
        ...current,
        [key]: {
          ...(current[key] ?? originals.get(key) ?? EMPTY_DRAFT),
          ...patch,
        },
      }));
    },
    [originals]
  );

  const changes = useMemo(() => {
    const list: Change[] = [];
    for (const [key, draft] of Object.entries(drafts)) {
      const original = originals.get(key);
      const finding = byKey.get(key);
      if (!original || !finding) continue;
      const diff = diffDraft(original, draft);
      if (diff.quantity || diff.notes || diff.measurements.length > 0) {
        list.push({ key, finding, draft, ...diff });
      }
    }
    return list;
  }, [drafts, originals, byKey]);

  const errors = useMemo(() => {
    const quantity: Record<string, string> = {};
    const measurements: Record<string, string> = {};
    for (const change of changes) {
      const quantityError = change.quantity ? validateQuantity(change.draft.quantity) : null;
      if (quantityError) quantity[change.key] = quantityError;
      for (const index of change.measurements) {
        const error = validateMeasurement(change.draft.measurements[index] ?? "");
        if (error) measurements[`${change.key}:${index}`] = error;
      }
    }
    return { quantity, measurements };
  }, [changes]);

  const errorOf = useCallback((key: string) => errors.quantity[key] ?? null, [errors]);
  const measurementErrorOf = useCallback(
    (key: string, index: number) => errors.measurements[`${key}:${index}`] ?? null,
    [errors]
  );
  const hasErrors =
    Object.keys(errors.quantity).length > 0 || Object.keys(errors.measurements).length > 0;

  /** Costo que se va a imprimir: cantidad × costo unitario mientras se edita. */
  const costOf = useCallback(
    (finding: AuditFinding): number => {
      const draft = drafts[keyOf(finding)];
      if (!draft) return finding.calculatedCost ?? 0;
      const quantity = parseQuantity(draft.quantity);
      if (quantity === null || Number.isNaN(quantity)) return finding.calculatedCost ?? 0;
      return quantity > 0 && (finding.unitCost ?? 0) > 0
        ? quantity * (finding.unitCost as number)
        : 0;
    },
    [drafts, keyOf]
  );

  const discard = useCallback(() => {
    setDrafts({});
    setSaveError(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (changes.length === 0 || hasErrors) return false;
    setIsSaving(true);
    setSaveError(null);

    const saved: string[] = [];
    let failure: unknown = null;
    for (const change of changes) {
      const input: UpdateAuditFindingInput = {
        auditId,
        questionCode: change.finding.questionCode,
      };
      if (sharedCodes.has(change.finding.questionCode) && change.finding.mitigationId) {
        input.mitigationId = change.finding.mitigationId;
      }
      if (change.quantity) input.quantity = parseQuantity(change.draft.quantity) as number;
      if (change.notes) input.notes = change.draft.notes;
      if (change.measurements.length > 0) {
        // El backend pide todas las mediciones, en orden; sólo cambian las editadas.
        input.measurements = change.finding.measurements.map((measurement, index) => ({
          name: measurement.name,
          value:
            change.measurements.includes(index)
              ? (parseQuantity(change.draft.measurements[index] ?? "") as number)
              : measurement.value,
        }));
      }
      try {
        await updateAuditFinding(input);
        saved.push(change.key);
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
      for (const key of saved) delete next[key];
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
  }, [auditId, changes, hasErrors, sharedCodes, queryClient]);

  return {
    keyOf,
    draftOf,
    setDraft,
    errorOf,
    measurementErrorOf,
    costOf,
    isDirty: changes.length > 0,
    hasErrors,
    isSaving,
    saveError,
    save,
    discard,
  };
}

export type ReportDrafts = ReturnType<typeof useReportDrafts>;

export default useReportDrafts;
