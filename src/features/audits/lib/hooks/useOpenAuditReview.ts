import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Audit } from "@entities/audit/model";
import { useSendForReviewAudit } from "@features/audits/lib/hooks/useSendForReviewAudit";
import { isAuditReviewAvailable } from "../audit-review-availability";
import { buildAuditEditHref } from "@features/audits/lib/audit-edit-href";

export type UseOpenAuditReviewOptions = {
  /** Destino del botón "Back" de la edición (p. ej. el proyecto de origen). */
  returnTo?: string | undefined;
  /** Se invoca cuando la revisión enviada queda lista. */
  onReady?: (() => void) | undefined;
};

/**
 * Abre la revisión (QC) de una auditoría:
 * - Conforme (sin hallazgos): no hay reporte; se abre el aviso "No Report Needed".
 * - Borrador pendiente: primero se envía a revisión y se navega al resolverse.
 * - En revisión o entregada: se navega al detalle.
 * - Campo, eliminada o desconocida: no se abre QC ni se envía a revisión.
 */
export function useOpenAuditReview(options: UseOpenAuditReviewOptions = {}) {
  const { returnTo, onReady } = options;
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAuditId, setPendingAuditId] = useState<string | null>(null);
  const [noReportNeededOpen, setNoReportNeededOpen] = useState(false);

  const { start: startSendForReview, sendResult } = useSendForReviewAudit({
    refetchIntervalMs: 5000,
    stopWhenReady: true,
    onReady: () => onReady?.(),
  });

  const openReview = useCallback(
    (audit: Audit, isCompliant?: boolean) => {
      if (!isAuditReviewAvailable(audit.status)) return;
      if (isCompliant) {
        setNoReportNeededOpen(true);
        return;
      }
      if (audit.status === "draft_report_pending_review") {
        setEditingId(audit.id);
        startSendForReview(audit.id);
        setPendingAuditId(audit.id);
        return;
      }
      setEditingId(audit.id);
      router.push(
        buildAuditEditHref(audit.id, {
          auditor: audit.auditorName ?? audit.createdBy ?? "",
          returnTo,
        })
      );
    },
    [router, startSendForReview, returnTo]
  );

  // Navega cuando el envío a revisión responde.
  useEffect(() => {
    if (!sendResult || !pendingAuditId) return;
    router.push(buildAuditEditHref(pendingAuditId, { returnTo }));
    setPendingAuditId(null);
  }, [sendResult, pendingAuditId, router, returnTo]);

  return {
    openReview,
    editingId,
    noReportNeeded: {
      open: noReportNeededOpen,
      onOpenChange: setNoReportNeededOpen,
    },
  };
}

export default useOpenAuditReview;
