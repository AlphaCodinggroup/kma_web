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
}

const STATUS_OPTIONS = [
    { value: "", label: "All Audits in progress" },
    { value: "draft_report_pending_review", label: "Draft Report Pending Review" },
    { value: "draft_report_in_review", label: "Draft Report In Review" },
    { value: "final_report_sent_to_client", label: "Final Report Sent to Client" },
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
}) => {
    const hasActiveFilters = auditorFilter !== "" || statusFilter !== "";

    return (
        <div className="flex items-center gap-2">
            <FilterSelect
                value={auditorFilter}
                onChange={onAuditorChange}
                allLabel="All Auditors"
                options={availableAuditors.map((auditor) => ({
                    value: auditor.id,
                    label: auditor.name,
                }))}
            />
            <FilterSelect
                value={statusFilter}
                onChange={onStatusChange}
                options={STATUS_OPTIONS}
            />
            {hasActiveFilters && <ClearFiltersButton onClick={onClearFilters} />}
        </div>
    );
};

export default AuditsFilters;
