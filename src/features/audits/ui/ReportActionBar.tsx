"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Undo2 } from "lucide-react";
import { cn } from "@shared/lib/cn";

export interface ReportActionBarProps {
  isDirty: boolean;
  hasErrors: boolean;
  isSaving: boolean;
  saveError: string | null;
  onSave: () => void;
  onDiscard: () => void;
  /** Se puede aprobar (admin, auditoría en revisión, con hallazgos). */
  canApprove: boolean;
  approving: boolean;
  onApprove: () => void;
  /** Ya hay PDF para descargar. */
  canDownload: boolean;
  downloading: boolean;
  onDownload: () => void;
}

const RETURN_TOOLTIP = "Requires backend: return to the auditor";

const buttonBase =
  "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Barra fija al pie del reporte: aviso de cambios sin guardar y las acciones
 * de QC. Con cambios pendientes no se puede aprobar ni descargar.
 */
const ReportActionBar: React.FC<ReportActionBarProps> = ({
  isDirty,
  hasErrors,
  isSaving,
  saveError,
  onSave,
  onDiscard,
  canApprove,
  approving,
  onApprove,
  canDownload,
  downloading,
  onDownload,
}) => {
  const blockedBySave = isDirty ? "Save your changes first" : undefined;

  return (
    <div
      className="sticky bottom-0 z-10 mt-4 space-y-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur"
      data-testid="report-action-bar"
    >
      {(isDirty || saveError) && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {saveError ?? "Changes detected — save to continue"}
          </span>
          {isDirty && (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDiscard}
                disabled={isSaving}
                className={cn(buttonBase, "border-gray-300 bg-white py-1.5 text-gray-900 hover:bg-gray-100")}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || hasErrors}
                title={hasErrors ? "Fix the highlighted fields first" : undefined}
                className={cn(buttonBase, "border-black bg-black py-1.5 text-white hover:bg-gray-800")}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving ? "Saving…" : "Save"}
              </button>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={!canApprove || isDirty || approving}
          title={blockedBySave ?? (canApprove ? "Approve and generate the report" : "Only an audit in review can be approved")}
          className={cn(buttonBase, "border-black bg-black text-white hover:bg-gray-800")}
        >
          {approving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          Approve
        </button>
        <button
          type="button"
          disabled
          title={RETURN_TOOLTIP}
          aria-description={RETURN_TOOLTIP}
          className={cn(buttonBase, "border-gray-300 bg-white text-gray-900")}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          Return
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!canDownload || isDirty || downloading}
          title={blockedBySave ?? (canDownload ? "Download the project report" : "Available once the report is approved")}
          className={cn(buttonBase, "border-gray-300 bg-white text-gray-900 hover:bg-gray-100")}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Download
        </button>
      </div>
    </div>
  );
};

export default ReportActionBar;
