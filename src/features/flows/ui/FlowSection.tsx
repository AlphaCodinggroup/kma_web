"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import { FlowCard } from "./FlowCard";

export interface FlowItemVM {
  id: string;
  title: string;
  description?: string;
  questionsCount: number;
}

export interface FlowSectionProps {
  items: FlowItemVM[];
  className?: string;
  bodyClassName?: string;
  emptyMessage?: string;
  "data-testid"?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
}

/**
 * Sección reutilizable para listar Flows
 * - Grid responsivo de FlowCard
 * - Empty state
 */
export const FlowSection: React.FC<FlowSectionProps> = ({
  items,
  className,
  bodyClassName,
  emptyMessage = "No flows found",
  "data-testid": dataTestId,
}) => {
  const hasItems = items.length > 0;

  return (
    <section
      data-testid={dataTestId ?? "flows-section"}
      className={cn("w-full", className)}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3",
          "mt-0",
          bodyClassName
        )}
      >
        {hasItems ? (
          items.map((f) => (
            <FlowCard
              key={f.id}
              title={f.title}
              {...(f.description ? { description: f.description } : {})}
              questionsCount={f.questionsCount}
              onViewQuestions={() => {}}
            />
          ))
        ) : (
          <div className="col-span-full rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
};

export default FlowSection;
