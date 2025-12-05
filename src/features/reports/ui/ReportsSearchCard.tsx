"use client";

import React, { type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";

export interface ReportsSearchCardProps {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rightSlot?: ReactNode;
}

const ReportsSearchCard: React.FC<ReportsSearchCardProps> = ({
  query,
  onQueryChange,
  placeholder = "Search by project name, auditor, or report ID…",
  className,
}) => {
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
        value={query}
        onChange={(e) => onQueryChange(e.currentTarget.value)}
      />
    </section>
  );
};

export default ReportsSearchCard;
