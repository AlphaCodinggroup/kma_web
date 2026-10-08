"use client";

import React from "react";
import SearchInput from "@shared/ui/search-input";
import { ClearFiltersButton, FilterSelect } from "@shared/ui/filter-select";
import type {
  AuditFilterOptions,
  AuditFilters,
} from "@widgets/project-detail/lib/audit-filters";

export interface ProjectAuditsToolbarProps {
  filters: AuditFilters;
  options: AuditFilterOptions;
  onFilterChange: (key: keyof AuditFilters, value: string) => void;
  onClear: () => void;
  /** Hay algún filtro cargado (muestra el botón de limpiar). */
  hasValues: boolean;
  /** Se está filtrando (muestra cuántas auditorías quedan). */
  isFiltering: boolean;
  shown: number;
  total: number;
}

/** Buscador y filtros de las auditorías del proyecto. */
const ProjectAuditsToolbar: React.FC<ProjectAuditsToolbarProps> = ({
  filters,
  options,
  onFilterChange,
  onClear,
  hasValues,
  isFiltering,
  shown,
  total,
}) => (
  <div className="space-y-3 border-y border-[var(--kma-border)] py-4">
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        placeholder="Search audits…"
        aria-label="Search audits"
        value={filters.query}
        onChange={(e) => onFilterChange("query", e.target.value)}
        containerClassName="min-w-0 basis-full flex-1 lg:basis-60"
      />
      <FilterSelect
        className="min-h-11 min-w-0 flex-1 sm:flex-none"
        ariaLabel="Filter by facility"
        allLabel="All facilities"
        value={filters.facility}
        options={options.facilities}
        onChange={(value) => onFilterChange("facility", value)}
      />
      <FilterSelect
        className="min-h-11 min-w-0 flex-1 sm:flex-none"
        ariaLabel="Filter by flow"
        allLabel="All flows"
        value={filters.flow}
        options={options.flows}
        onChange={(value) => onFilterChange("flow", value)}
      />
      <FilterSelect
        className="min-h-11 min-w-0 flex-1 sm:flex-none"
        ariaLabel="Filter by status"
        allLabel="All statuses"
        value={filters.status}
        options={options.statuses}
        onChange={(value) => onFilterChange("status", value)}
      />
      {hasValues && <ClearFiltersButton onClick={onClear} />}
    </div>
    {isFiltering && (
      <p className="text-sm text-[var(--kma-muted)]" aria-live="polite">
        Showing {shown} of {total} audits
      </p>
    )}
  </div>
);

export default ProjectAuditsToolbar;
