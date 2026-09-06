"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import TableHeader from "@shared/ui/table-header";
import SearchInput from "@shared/ui/search-input";

export interface UsersSearchCardProps {
  query: string;
  onQueryChange: (val: string) => void;
  className?: string;
  total: number;
  placeholder?: string;
  children?: React.ReactNode;
}

/**
 * Card superior con buscador y botón "Add User".
 * Visual-only. Mantiene la estética del zip (bordes, gris claro, densidad).
 */
const UsersSearchCard: React.FC<UsersSearchCardProps> = ({
  query,
  onQueryChange,
  className,
  total,
  placeholder,
  children,
}) => {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-4 md:p-6",
        className
      )}
    >
      <TableHeader
        title="Users"
        subtitle="Total Users"
        total={total}
      />
      {/* Search input */}
      <div className="mb-4">
        <div className="relative">
          <SearchInput
            value={query}
            onChange={(e) => onQueryChange(e.currentTarget.value)}
            placeholder={placeholder}
            aria-label="Search users"
          />
        </div>
      </div>
      {children}
    </section>
  );
};

export default UsersSearchCard;
