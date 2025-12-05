"use client";

import React from "react";
import { Filter as FilterIcon } from "lucide-react";
import { Button } from "@shared/ui/controls";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";

export interface AuditsToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string | undefined;
  onFiltersClick?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * Encabezado de la vista de Audits:
 *  - PageHeader (título/subtítulo reutilizable)
 *  - Search + botón "Filters"
 */
const AuditsToolbar: React.FC<AuditsToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search audits…",
  onFiltersClick,
  className,
}) => {
  return (
    <section className={cn("space-y-6 mb-4", className)}>
      <div className="grid grid-cols-10 items-center gap-3">
        <SearchInput
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          containerClassName="col-span-9"
        />
        <Button
          type="button"
          onClick={onFiltersClick}
          className="col-span-1 w-full justify-center inline-flex items-center gap-2"
          aria-label="Open filters"
        >
          <FilterIcon className="h-4 w-4" aria-hidden />
          <span>Filters</span>
        </Button>
      </div>
    </section>
  );
};

export default AuditsToolbar;
