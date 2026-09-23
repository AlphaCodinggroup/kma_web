import { useCallback, useMemo } from "react";
import type { Audit } from "@entities/audit/model";
import useListAudits from "@features/audits/lib/hooks/useListAudits";

/**
 * Auditorías de un proyecto.
 *
 * El listado del backend no filtra por proyecto y, sin estado, excluye las
 * completadas: se piden las en curso y las completadas, y se filtran acá por
 * `projectId`. Cada llamada trae hasta el límite del listado (200), así que un
 * proyecto puede quedar incompleto si el sistema supera ese volumen; el filtro
 * por proyecto en el backend lo resuelve.
 */
export function useProjectAudits(projectId: string | undefined) {
  const enabled = Boolean(projectId);
  const inProgress = useListAudits({ enabled });
  const completed = useListAudits({ enabled, status: "completed" });

  const audits = useMemo<Audit[]>(() => {
    if (!projectId) return [];
    // Por id, por si una auditoría cambió de estado entre ambas respuestas.
    const byId = new Map<string, Audit>();
    for (const audit of [
      ...(inProgress.data?.audits ?? []),
      ...(completed.data?.audits ?? []),
    ]) {
      if (audit.projectId === projectId) byId.set(audit.id, audit);
    }
    return Array.from(byId.values());
  }, [projectId, inProgress.data, completed.data]);

  const { refetch: refetchInProgress } = inProgress;
  const { refetch: refetchCompleted } = completed;
  const refetch = useCallback(
    () => Promise.all([refetchInProgress(), refetchCompleted()]),
    [refetchInProgress, refetchCompleted]
  );

  return {
    audits,
    isLoading: inProgress.isLoading || completed.isLoading,
    isFetching: inProgress.isFetching || completed.isFetching,
    isError: inProgress.isError || completed.isError,
    refetch,
  };
}

export default useProjectAudits;
