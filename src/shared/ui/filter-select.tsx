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
        "min-w-0 max-w-full min-h-11 sm:min-h-10 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 py-1.5 text-sm text-[var(--kma-muted)] hover:border-[var(--kma-border)] focus:border-[var(--kma-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kma-primary)]/25 transition-colors duration-150",
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
      className="inline-flex h-[var(--kma-control-height)] w-[var(--kma-control-height)] shrink-0 items-center justify-center rounded border border-[var(--kma-border)] bg-[var(--kma-subtle)] transition-colors duration-150 hover:border-[var(--kma-primary)] hover:bg-[var(--kma-surface)]"
      aria-label="Clear filters"
    >
      <X aria-hidden="true" className="h-5 w-5 stroke-[2.5] text-[var(--kma-muted)]" />
    </button>
  );
}

export default FilterSelect;
