"use client";

import React, { type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";
import TableHeader from "@shared/ui/table-header";

export interface FacilitySearchCardProps {
  total?: number;
  query: string;
  onQueryChange: (value: string) => void;
  children?: ReactNode;
  className?: string;
  placeholder?: string;
}

const FacilitySearchCard: React.FC<FacilitySearchCardProps> = ({
  total = 0,
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
        className
      )}
    >
      {/* Header */}
      <TableHeader title="Buildings" subtitle="Total buildings" total={total} />

      <div className="mb-4">
        <div className="relative">
          <SearchInput
            value={query}
            onChange={(e) => onQueryChange(e.currentTarget.value)}
            placeholder={placeholder}
            aria-label="Search projects"
          />
        </div>
      </div>
      {children}
    </section>
  );
};

export default FacilitySearchCard;
