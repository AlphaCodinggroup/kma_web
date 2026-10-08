"use client";

import React from "react";
import { ClearFiltersButton, FilterSelect } from "@shared/ui/filter-select";
import type { AuditorOption } from "@features/audits/lib/hooks/useAuditors";

export interface AuditsFiltersProps {
    auditorFilter: string;
    statusFilter: string;
    onAuditorChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onClearFilters: () => void;
    availableAuditors: AuditorOption[];
    /** Hay texto de búsqueda: el botón de limpiar también lo borra, así que debe mostrarse. */
    searchActive?: boolean;
}

export const AUDIT_STATUS_FILTER_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "audit_in_progress", label: "Fieldwork" },
    { value: "draft_report_pending_review", label: "Pending review" },
    { value: "draft_report_in_review", label: "In review" },
    { value: "final_report_sent_to_client", label: "Delivered" },
    { value: "completed", label: "Completed" },
];

/**
 * Componente de filtros para la tabla de auditorías.
 * Incluye dropdowns para auditor y estado, más un botón para limpiar filtros.
 */
const AuditsFilters: React.FC<AuditsFiltersProps> = ({
    auditorFilter,
    statusFilter,
    onAuditorChange,
    onStatusChange,
    onClearFilters,
    availableAuditors,
    searchActive = false,
}) => {
    const hasActiveFilters = auditorFilter !== "" || statusFilter !== "" || searchActive;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
                ariaLabel="Filter by auditor"
                value={auditorFilter}
                onChange={onAuditorChange}
                allLabel="All Auditors"
                options={availableAuditors.map((auditor) => ({
                    value: auditor.id,
                    label: auditor.name,
                }))}
            />
            <FilterSelect
                ariaLabel="Filter by audit status"
                value={statusFilter}
                onChange={onStatusChange}
                options={AUDIT_STATUS_FILTER_OPTIONS}
            />
            {hasActiveFilters && <ClearFiltersButton onClick={onClearFilters} />}
        </div>
    );
};

export default AuditsFilters;

/** Devuelve el estado de la URL solo si es uno de los que el filtro ofrece; cualquier otro valor equivale a «todos». */
export const toAuditStatusFilter = (raw: string): string =>
    AUDIT_STATUS_FILTER_OPTIONS.some((option) => option.value === raw) ? raw : "";
