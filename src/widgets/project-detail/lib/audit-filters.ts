import type { Audit, AuditStatus } from "@entities/audit/model";
import { AUDIT_STATUS_LABELS } from "@shared/ui/badge";
import type { FilterOption } from "@shared/ui/filter-select";
import type { FacilitySection } from "@widgets/project-detail/lib/project-sections";

/** Filtros de las auditorías del proyecto; "" = sin filtro. */
export type AuditFilters = {
  query: string;
  facility: string;
  flow: string;
  status: string;
};

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  query: "",
  facility: "",
  flow: "",
  status: "",
};

/** Valor del filtro de facility para las auditorías sin facility. */
export const NO_FACILITY_VALUE = "none";

export type AuditFilterOptions = {
  facilities: FilterOption[];
  flows: FilterOption[];
  statuses: FilterOption[];
};

// Nombres de los parámetros en la URL.
const PARAM_BY_KEY: Record<keyof AuditFilters, string> = {
  query: "q",
  facility: "facility",
  flow: "flow",
  status: "status",
};

/** Valor de facility de una auditoría o sección para comparar con el filtro. */
export const facilityFilterValue = (facilityId: string | null | undefined) =>
  facilityId || NO_FACILITY_VALUE;

const byLabel = (a: FilterOption, b: FilterOption) => a.label.localeCompare(b.label);

/**
 * Opciones de los filtros: las facilities del árbol (en su orden), los flows
 * que aparecen en las auditorías y los estados de la máquina.
 */
export function buildAuditFilterOptions(
  sections: readonly Pick<FacilitySection, "facilityId" | "name">[],
  audits: readonly Audit[]
): AuditFilterOptions {
  const flows = new Map<string, string>();
  for (const audit of audits) {
    if (audit.flowId && !flows.has(audit.flowId)) {
      flows.set(audit.flowId, audit.flowName || audit.flowId);
    }
  }

  return {
    facilities: sections.map((section) => ({
      value: facilityFilterValue(section.facilityId),
      label: section.name,
    })),
    flows: Array.from(flows, ([value, label]) => ({ value, label })).sort(byLabel),
    statuses: (Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[]).map((status) => ({
      value: status,
      label: AUDIT_STATUS_LABELS[status],
    })),
  };
}

/** Descarta los valores que no están entre las opciones (p. ej. una URL vieja). */
export function sanitizeAuditFilters(
  filters: AuditFilters,
  options: AuditFilterOptions
): AuditFilters {
  const keep = (value: string, list: readonly FilterOption[]) =>
    list.some((option) => option.value === value) ? value : "";
  return {
    query: filters.query,
    facility: keep(filters.facility, options.facilities),
    flow: keep(filters.flow, options.flows),
    status: keep(filters.status, options.statuses),
  };
}

/** Filtra por facility, flow y estado, y busca `query` (ya normalizada) en el texto visible. */
export function filterProjectAudits(
  audits: readonly Audit[],
  filters: Omit<AuditFilters, "query">,
  query: string
): Audit[] {
  return audits.filter((audit) => {
    if (filters.facility && facilityFilterValue(audit.facilityId) !== filters.facility) {
      return false;
    }
    if (filters.flow && audit.flowId !== filters.flow) return false;
    if (filters.status && audit.status !== filters.status) return false;
    if (!query) return true;
    return [
      audit.flowName,
      audit.facilityName,
      audit.auditorName,
      AUDIT_STATUS_LABELS[audit.status],
    ].some((text) => text?.toLowerCase().includes(query));
  });
}

/** Lee los filtros de la URL. */
export function parseAuditFilters(params: {
  get(name: string): string | null;
}): AuditFilters {
  const read = (key: keyof AuditFilters) => params.get(PARAM_BY_KEY[key]) ?? "";
  return {
    query: read("query"),
    facility: read("facility"),
    flow: read("flow"),
    status: read("status"),
  };
}

/** Query string de los filtros activos, sin "?" ("" si no hay ninguno). */
export function serializeAuditFilters(filters: AuditFilters): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(PARAM_BY_KEY) as (keyof AuditFilters)[]) {
    const value = key === "query" ? filters.query.trim() : filters[key];
    if (value) params.set(PARAM_BY_KEY[key], value);
  }
  return params.toString();
}
