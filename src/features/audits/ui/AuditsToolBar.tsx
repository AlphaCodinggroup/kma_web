"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";
import AuditsFilters from "./AuditsFilters";
import type { AuditorOption } from "@features/audits/lib/hooks/useAuditors";

export interface AuditsToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string | undefined;
  className?: string | undefined;
  // Filter props
  auditorFilter?: string;
  statusFilter?: string;
  onAuditorFilterChange?: (value: string) => void;
  onStatusFilterChange?: (value: string) => void;
  onClearFilters?: () => void;
  availableAuditors?: AuditorOption[];
}

/**
 * Encabezado de la vista de Audits:
 *  - PageHeader (título/subtítulo reutilizable)
 *  - Search + filtros (auditor, estado)
 */
const AuditsToolbar: React.FC<AuditsToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search audits…",
  className,
  auditorFilter = "",
  statusFilter = "",
  onAuditorFilterChange,
  onStatusFilterChange,
  onClearFilters,
  availableAuditors = [],
}) => {
  const showFilters =
    onAuditorFilterChange && onStatusFilterChange && onClearFilters;

  return (
    <section className={cn("space-y-6 mb-4", className)}>
      <div className="flex items-center gap-3">
        <SearchInput
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          containerClassName="flex-1"
        />
        {showFilters && (
          <AuditsFilters
            auditorFilter={auditorFilter}
            statusFilter={statusFilter}
            onAuditorChange={onAuditorFilterChange}
            onStatusChange={onStatusFilterChange}
            onClearFilters={onClearFilters}
            availableAuditors={availableAuditors}
          />
        )}
      </div>
    </section>
  );
};

export default AuditsToolbar;
