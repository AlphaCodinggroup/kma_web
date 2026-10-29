"use client";

import React from "react";
import FlowCardWithDialog from "./FlowCardWithDialog";

export interface FlowItemVM {
  id: string;
  title: string;
  description?: string;
  flowId?: string;
  code?: string | undefined;
}

export interface FlowsSectionProps {
  /** Lista de flows a mostrar (catálogo de la página). */
  items: FlowItemVM[];
  className?: string;
  onDeleted?: (() => void) | undefined;
  "data-testid"?: string;
}
/**
 * Sección de catálogo de Flows
 * - Enlaza cada card con FlowQuestionsDialog vía FlowCardWithDialog.
 */
export const FlowsSection: React.FC<FlowsSectionProps> = ({
  items,
  className,
  onDeleted,
  "data-testid": testId,
}) => {
  return (
    <section className={className} data-testid={testId ?? "flows-section"}>
      <div className="divide-y divide-[var(--kma-border)]">
        {items.map((it) => {
          return (
            <FlowCardWithDialog
              key={it.id}
              flowId={it.flowId ?? it.id}
              title={it.title}
              code={it.code}
              description={it.description ?? ""}
              data-testid={`flow-card-${it.id}`}
              {...(onDeleted ? { onDeleted } : {})}
              dialogTestId={`flow-dialog-${it.id}`}
            />
          );
        })}
      </div>
    </section>
  );
};

export default FlowsSection;
