"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@shared/ui/controls";
import type { AuditorOption } from "@features/audits/lib/hooks/useAuditors";

import { AUDIT_STATUSES, AUDIT_STATUS_LABELS } from "@entities/audit/lib/audit-status";
export interface AuditsFiltersProps {
    auditorFilter: string;
    statusFilter: string;
    onAuditorChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onClearFilters: () => void;
    availableAuditors: AuditorOption[];
}

// Built from the shared vocabulary so the filter can never offer a state the
// rest of the app does not know, or miss one it does.
const STATUS_OPTIONS = [
    { value: "", label: "All Audit Statuses" },
    ...AUDIT_STATUSES.map((status) => ({
        value: status,
        label: AUDIT_STATUS_LABELS[status],
    })),
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
            {/* Auditor Filter */}
            <select
                aria-label="Filter by auditor"
                value={auditorFilter}
                onChange={(e) => onAuditorChange(e.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
            >
                <option value="">All Auditors</option>
                {availableAuditors.map((auditor) => (
                    <option key={auditor.id} value={auditor.id}>
                        {auditor.name}
                    </option>
                ))}
            </select>

            {/* Status Filter */}
            <select
                aria-label="Filter by audit status"
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
            >
                {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
                <Button
                    onClick={onClearFilters}
                    className="h-9 w-9 p-0 rounded-md bg-red-50 hover:bg-red-100 transition-all duration-200 border border-red-300 hover:border-red-500"
                    aria-label="Clear filters"
                >
                    <X className="h-5 w-5 stroke-[2.5] text-red-600" />
                </Button>
            )}
        </div>
    );
};

export default AuditsFilters;
