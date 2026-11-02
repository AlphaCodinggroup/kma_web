"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Undo2 } from "lucide-react";
import { Button } from "@shared/ui/controls";

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

const RETURN_TOOLTIP = "Returning an audit is currently unavailable";

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
      className="sticky bottom-0 z-30 mt-4 space-y-3 border-y border-[var(--kma-border)] bg-[var(--kma-surface)] px-4 py-4 sm:px-6"
      data-testid="report-action-bar"
    >
      {(isDirty || saveError) && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] pb-3 text-sm text-[var(--kma-warning)]"
          role="status"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {saveError ?? "Changes detected — save to continue"}
          </span>
          {isDirty && (
            <span className="flex items-center gap-2">
              <Button fullWidth={false}
                type="button"
                onClick={onDiscard}
                disabled={isSaving}
                variant="secondary"
              >
                Discard
              </Button>
              <Button fullWidth={false}
                type="button"
                onClick={onSave}
                disabled={isSaving || hasErrors}
                title={hasErrors ? "Fix the highlighted fields first" : undefined}
                variant="primary"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--kma-muted)]">{isDirty ? "Unsaved report changes" : canDownload ? "Project PDF is ready" : canApprove ? "Review the findings before approval" : "Report actions depend on audit status"}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button fullWidth={false}
            type="button"
            onClick={onApprove}
            disabled={!canApprove || isDirty || approving}
            title={blockedBySave ?? (canApprove ? "Approve and generate the report" : "Only an audit in review can be approved")}
            variant="primary"
          >
            {approving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            Approve
          </Button>
          <Button fullWidth={false}
            type="button"
            disabled
            title={RETURN_TOOLTIP}
            aria-description={RETURN_TOOLTIP}
            variant="secondary"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Return
          </Button>
          <Button fullWidth={false}
            type="button"
            onClick={onDownload}
            disabled={!canDownload || isDirty || downloading}
            title={blockedBySave ?? (canDownload ? "Download the project report" : "Available once the report is approved")}
            variant="secondary"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportActionBar;
