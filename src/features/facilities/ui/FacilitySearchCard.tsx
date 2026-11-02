"use client";

import React, { type ReactNode } from "react";
import { Archive } from "lucide-react";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";

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
        "overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]",
        className,
      )}
    >
      <div className="grid items-center gap-4 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(220px,1fr)_auto]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold">{showArchived ? "Archived facilities" : "Facilities"}</h2>
          <span aria-label={`${showArchived ? "Archived facilities" : "Active facilities"}: ${total}`} className="border-l border-[var(--kma-border)] pl-3 text-sm font-medium tabular-nums text-[var(--kma-muted)]">{total}</span>
        </div>
        <div className="min-w-0 lg:mx-4">
          <SearchInput value={query} onChange={(e) => onQueryChange(e.currentTarget.value)} placeholder={placeholder ?? "Search facilities by name, address or city..."} aria-label="Search facilities" />
        </div>
        {onToggleArchived ? (
          <button type="button" onClick={onToggleArchived} className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-[var(--kma-border)] px-3 text-sm font-medium text-[var(--kma-muted)] transition-colors hover:bg-[var(--kma-subtle)] hover:text-[var(--kma-fg)]" aria-label={showArchived ? "Show active facilities" : "Show archived facilities"}>
            <Archive className="h-4 w-4" aria-hidden="true" />
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        ) : null}
      </div>


      {/* Slot para la tabla/listado */}
      {children}
    </section>
  );
};

export default FacilitySearchCard;
