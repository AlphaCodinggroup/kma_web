"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import SearchInput from "@shared/ui/search-input";
import TableHeader from "@shared/ui/table-header";

export interface ProjectsSearchCardProps {
  total: number;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
}

const ProjectsSearchCard: React.FC<ProjectsSearchCardProps> = ({
  total,
  query,
  onQueryChange,
  placeholder = "Search projects...",
  children,
  className,
}) => {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-4 md:p-6",
        className
      )}
    >
      {/* Encabezado */}
      <TableHeader title="Projects" subtitle="Total projects" total={total} />

      {/* Buscador */}
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

      {/* Slot para la tabla/listado */}
      {children}
    </section>
  );
};

export default ProjectsSearchCard;
