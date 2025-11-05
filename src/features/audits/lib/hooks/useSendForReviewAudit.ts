import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSendForReviewMutation } from "./useSendForReview";
import { usePollAuditReview } from "./usePoollAuditReview";
import type { ApiError } from "@shared/interceptors/error";
import type { ReviewProgress } from "@entities/audit/model/sendReview";

/**
 * - start(auditId): hace POST /send-for-review
 * - Cuando resuelve, guarda auditReviewId y comienza el polling cada 5s
 * - Se detiene cuando reviewReady === true o status === "pending_review"
 */
export function useSendForReviewAudit(opts?: {
  refetchIntervalMs?: number;
  stopWhenReady?: boolean;
  onReady?: (progress: ReviewProgress) => void;
}) {
  const {
    refetchIntervalMs = 5000,
    stopWhenReady = true,
    onReady,
  } = opts ?? {};

  const [auditReviewId, setAuditReviewId] = useState<string | undefined>();
  const [started, setStarted] = useState(false);

  //  POST send-for-review
  const {
    mutate: mutateSend,
    isPending: isSending,
    error: sendError,
    reset: resetMutation,
    data: sendResult,
  } = useSendForReviewMutation({
    onSuccess: (res) => {
      setAuditReviewId(res.auditReviewId);
      setStarted(true);
    },
  });

  // GET estado de la revisión
  const {
    data: progress,
    isFetching: isPolling,
    error: pollError,
  } = usePollAuditReview({
    auditReviewId,
    enabled: started && Boolean(auditReviewId),
    refetchIntervalMs,
    stopWhenReady,
  });

  // Llamar onReady una sola vez cuando quede listo
  const readyCalledRef = useRef(false);
  const isReady =
    progress?.reviewReady === true || progress?.status === "pending_review";

  useEffect(() => {
    if (!isReady || readyCalledRef.current) return;
    readyCalledRef.current = true;
    onReady?.(progress as ReviewProgress);
  }, [isReady, onReady, progress]);

  // Mensaje recomendado para UI
  const uiMessage = useMemo(() => {
    if (isSending) return "Enviando para revisión…";
    if (isReady) return "Enviado para revisión. Esperando QC.";
    if (auditReviewId) return "Generando borrador de informe…";
    return "";
  }, [isSending, isReady, auditReviewId]);

  // API pública del hook
  const start = useCallback(
    (auditId: string) => {
      readyCalledRef.current = false;
      setStarted(false);
      setAuditReviewId(undefined);
      resetMutation();
      mutateSend({ auditId });
    },
    [mutateSend, resetMutation]
  );

  const reset = useCallback(() => {
    readyCalledRef.current = false;
    setStarted(false);
    setAuditReviewId(undefined);
    resetMutation();
  }, [resetMutation]);

  return {
    start,
    reset,
    auditReviewId,
    progress,
    status: progress?.status,
    reviewReady: progress?.reviewReady === true,
    isSending,
    isPolling,
    isReady,
    sendError: sendError as ApiError | null,
    pollError: pollError as ApiError | null,
    uiMessage,
    sendResult,
  };
}
