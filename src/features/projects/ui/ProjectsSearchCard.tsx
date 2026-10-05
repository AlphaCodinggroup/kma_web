"use client";

import React from "react";
import { Archive } from "lucide-react";
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
  onCreateClick?: () => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

const ProjectsSearchCard: React.FC<ProjectsSearchCardProps> = ({
  total,
  query,
  onQueryChange,
  placeholder = "Search projects...",
  children,
  className,
  showArchived = false,
  onToggleArchived,
}) => {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-4 md:p-6",
        className
      )}
    >
      {/* Encabezado */}
      <TableHeader
        title="Projects"
        subtitle={showArchived ? "Archived projects" : "Total projects"}
        total={total}
        action={
          onToggleArchived ? (
            <button
              type="button"
              onClick={onToggleArchived}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label={
                showArchived ? "Show active projects" : "Show archived projects"
              }
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Show Active" : "Show Archived"}
            </button>
          ) : null
        }
      />

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
