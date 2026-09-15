"use client";

import React, { type ReactNode } from "react";
import { Archive } from "lucide-react";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";
import TableHeader from "@shared/ui/table-header";

export interface FacilitySearchCardProps {
  total: number;
  query: string;
  onQueryChange: (value: string) => void;
  children?: ReactNode;
  className?: string;
  placeholder?: string;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

const FacilitySearchCard: React.FC<FacilitySearchCardProps> = ({
  total,
  query,
  onQueryChange,
  children,
  className,
  placeholder,
  showArchived = false,
  onToggleArchived,
}) => {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-4 md:p-6",
        className,
      )}
    >
      {/* Encabezado */}
      <TableHeader
        title="Facilities"
        subtitle={showArchived ? "Archived facilities" : "Active facilities"}
        total={total}
        action={
          onToggleArchived ? (
            <button
              onClick={onToggleArchived}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label={showArchived ? "Show active facilities" : "Show archived facilities"}
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Show Active" : "Show Archived"}
            </button>
          ) : null
        }
      />

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <SearchInput
            value={query}
            onChange={(e) => onQueryChange(e.currentTarget.value)}
            placeholder={
              placeholder ?? "Search facilities by name, address or city..."
            }
            aria-label="Search facilities"
          />
        </div>
      </div>

      {/* Slot para la tabla/listado */}
      {children}
    </section>
  );
};

export default FacilitySearchCard;
