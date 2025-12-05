"use client";

import React, { type ReactNode } from "react";
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
}

const FacilitySearchCard: React.FC<FacilitySearchCardProps> = ({
  total,
  query,
  onQueryChange,
  children,
  className,
  placeholder,
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
        subtitle="Total facilities"
        total={total}
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
