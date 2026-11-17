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
  placeholder = "Search by project name, status, or date…",
  className,
}) => {
  return (
    <section
      aria-label="Search reports"
      className={cn(
        "w-full lg:w-80",
        className
      )}
    >
      <SearchInput
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.currentTarget.value)}
      />
    </section>
  );
};

export default ReportsSearchCard;
