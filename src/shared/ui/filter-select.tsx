"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/cn";

export type FilterOption = { value: string; label: string };

export interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterOption[];
  /** Opción vacía ("" = sin filtro); se omite si no se pasa. */
  allLabel?: string | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
}

/** Desplegable de filtro de las barras de búsqueda. */
export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  ariaLabel,
  className,
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={cn(
        "h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200",
        className
      )}
    >
      {allLabel !== undefined && <option value="">{allLabel}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Botón que limpia todos los filtros activos. No usa `Button`: su `w-full` por
 * defecto lo estiraba a todo el ancho cuando la barra pasa a otra línea.
 */
export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-300 bg-red-50 transition-all duration-200 hover:border-red-500 hover:bg-red-100"
      aria-label="Clear filters"
    >
      <X className="h-5 w-5 stroke-[2.5] text-red-600" />
    </button>
  );
}

export default FilterSelect;
