"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import { Input } from "@shared/ui/controls";
import { Search } from "lucide-react";

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
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-black">Projects</h2>
        <p className="text-sm font-semibold text-gray-600">
          Total projects: {total}
        </p>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.currentTarget.value)}
            placeholder={placeholder}
            aria-label="Search projects"
            className={cn(
              "h-11 w-full rounded-xl pl-9",
              "bg-white text-black placeholder:text-gray-500",
              "border-gray-300 focus-visible:ring-2 focus-visible:ring-black/30"
            )}
          />
        </div>
      </div>

      {/* Slot para la tabla/listado */}
      {children}
    </section>
  );
};

export default ProjectsSearchCard;
