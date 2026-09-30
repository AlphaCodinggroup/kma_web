import { useMemo } from "react";
import type { Audit } from "@entities/audit/model";
import useListAudits from "@features/audits/lib/hooks/useListAudits";

const NO_AUDITS: Audit[] = [];

/**
 * Auditorías de un proyecto.
 *
 * El backend filtra por `project_id` y, con ese filtro, devuelve todos los
 * estados, completadas incluidas (sin él excluye las completadas). Una sola
 * consulta alcanza; no hace falta pedir por estado ni filtrar acá.
 */
export function useProjectAudits(projectId: string | undefined) {
  const list = useListAudits({
    enabled: Boolean(projectId),
    ...(projectId ? { projectId } : {}),
  });

  const audits = useMemo<Audit[]>(
    () => (projectId ? (list.data?.audits ?? NO_AUDITS) : NO_AUDITS),
    [projectId, list.data]
  );

  return {
    audits,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    isError: list.isError,
    refetch: list.refetch,
  };
}

export default useProjectAudits;
