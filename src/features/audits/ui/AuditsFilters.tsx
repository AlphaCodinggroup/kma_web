"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@shared/ui/controls";
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
            {/* Auditor Filter */}
            <select
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
