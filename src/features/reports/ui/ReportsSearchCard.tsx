"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";

export interface ReportsSearchCardProps {
  value?: string;
  onValueChange?: (next: string) => void;
  onDebouncedChange?: (next: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
  rightSlot?: ReactNode;
}

const ReportsSearchCard: React.FC<ReportsSearchCardProps> = ({
  value,
  onValueChange,
  onDebouncedChange,
  debounceMs = 300,
  placeholder = "Search by project name, auditor, or report ID…",
  className,
}) => {
  const [inner, setInner] = useState<string>(value ?? "");

  useEffect(() => {
    if (value !== undefined && value !== inner) setInner(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounce para búsquedas
  useEffect(() => {
    if (!onDebouncedChange) return;
    const id = setTimeout(() => onDebouncedChange(inner), debounceMs);
    return () => clearTimeout(id);
  }, [inner, debounceMs, onDebouncedChange]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-6",
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Search Reports</h3>
      </div>
      <SearchInput
        placeholder={placeholder}
        value={inner}
        onChange={(e) => {
          const next = e.target.value;
          setInner(next);
          if (onValueChange) onValueChange(next);
        }}
      />
    </section>
  );
};

export default ReportsSearchCard;
