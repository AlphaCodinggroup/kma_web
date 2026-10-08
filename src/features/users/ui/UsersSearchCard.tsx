"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
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
 * Directorio de usuarios con búsqueda y tabla integradas.
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
        "overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]",
        className
      )}
    >
      <div className="grid items-center gap-4 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-base font-semibold">Team directory</h2>
          <p className="border-l border-[var(--kma-border)] pl-3 text-sm tabular-nums text-[var(--kma-muted)]">Total users: {total}</p>
        </div>
        <div className="relative min-w-0 lg:justify-self-end lg:w-full lg:max-w-md">
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
