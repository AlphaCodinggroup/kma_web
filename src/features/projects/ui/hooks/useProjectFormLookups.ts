import { useCallback, useMemo } from "react";
import type { FacilityListFilter } from "@entities/facility/model";
import type { Options, Project } from "@entities/projects/model";
import type { UserSummary } from "@entities/user/list.model";
import { useFacilitiesQuery } from "@features/facilities/ui/hooks/useFacilitiesQuery";
import { useUsersQuery } from "@features/users/ui/hooks/useUsersQuery";

export type UseProjectFormLookupsParams = {
  /** Carga los lookups sólo mientras el formulario está abierto. */
  enabled: boolean;
  /** Proyectos cuyas facilities se suman a las opciones (pueden estar archivadas). */
  projects: readonly Project[];
};

/**
 * Datos de apoyo del alta/edición de proyectos: auditores y facilities
 * elegibles, y la conversión de los ids elegidos al formato del dominio.
 */
export function useProjectFormLookups({
  enabled,
  projects,
}: UseProjectFormLookupsParams) {
  // Auditores para los modales
  const { data: auditorsData } = useUsersQuery({ role: "auditor" }, enabled);

  const auditors = useMemo<UserSummary[]>(
    () => auditorsData?.items ?? [],
    [auditorsData],
  );

  // Facilities activas para los modales
  const facilitiesFilters = useMemo<FacilityListFilter>(() => {
    return { status: "ACTIVE" };
  }, []);

  const { data: facilitiesData } = useFacilitiesQuery(
    facilitiesFilters,
    enabled,
  );

  const facilityOptions = useMemo<Options[]>(() => {
    const fromQuery =
      facilitiesData?.items?.map((f) => ({
        id: f.id,
        name: f.name,
      })) ?? [];

    const fromProjects = projects.flatMap((p) =>
      (p.facilities ?? []).map((f) => ({
        id: f.id,
        name: f.name,
      })),
    );

    const map = new Map<string, string>();
    for (const f of [...fromQuery, ...fromProjects]) {
      if (!map.has(f.id)) {
        map.set(f.id, f.name);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [facilitiesData, projects]);

  // Índices para mapear IDs → objetos { id, name }
  const auditorById = useMemo(() => {
    const map = new Map<string, UserSummary>();
    for (const a of auditors) {
      map.set(a.id, a);
    }
    return map;
  }, [auditors]);

  const facilityById = useMemo(() => {
    return new Map(facilityOptions.map((facility) => [facility.id, facility]));
  }, [facilityOptions]);

  /** Ids de auditores elegidos → usuarios del proyecto (se descartan los desconocidos). */
  const toProjectUsers = useCallback(
    (ids: readonly string[] | undefined): Options[] =>
      ids
        ?.map((id) => auditorById.get(id))
        .filter((u): u is UserSummary => Boolean(u))
        .map((u) => ({
          id: u.id,
          name: u.name?.trim() || u.email || u.id,
        })) ?? [],
    [auditorById],
  );

  /** Ids de facilities elegidas → facilities del proyecto (se descartan las desconocidas). */
  const toProjectFacilities = useCallback(
    (ids: readonly string[] | undefined): Options[] =>
      ids
        ?.map((id) => facilityById.get(id))
        .filter((facility): facility is Options => Boolean(facility)) ?? [],
    [facilityById],
  );

  return { auditors, facilityOptions, toProjectUsers, toProjectFacilities };
}
