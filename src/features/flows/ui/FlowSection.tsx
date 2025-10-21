"use client";

import React from "react";
import FlowCardWithDialog from "./FlowCardWithDialog";

export interface FlowItemVM {
  id: string;
  title: string;
  description?: string;
  questionsCount: number; // ← por ahora lo seguimos recibiendo; más adelante podemos derivarlo del flow real
  flowId?: string;
}

export interface FlowsSectionProps {
  /** Lista de flows a mostrar (catálogo de la página). */
  items: FlowItemVM[];
  className?: string;
  "data-testid"?: string;
}
/**
 * Sección de catálogo de Flows
 * - Enlaza cada card con FlowQuestionsDialog vía FlowCardWithDialog.
 */
export const FlowsSection: React.FC<FlowsSectionProps> = ({
  items,
  className,
  "data-testid": testId,
}) => {
  return (
    <section className={className} data-testid={testId ?? "flows-section"}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => {
          return (
            <FlowCardWithDialog
              key={it.id}
              flowId={it.flowId ?? it.id}
              title={it.title}
              description={it.description ?? ""}
              questionsCount={it.questionsCount}
              data-testid={`flow-card-${it.id}`}
              dialogTestId={`flow-dialog-${it.id}`}
            />
          );
        })}
      </div>
    </section>
  );
};

export default FlowsSection;

/** --------- Helper de demo opcional ----------
 * Podés eliminarlo cuando conectemos API real.
 */
export const DUMMY_FLOWS_SECTION_ITEMS: FlowItemVM[] = [
  {
    id: "fire-safety",
    title: "Fire Safety Audit Flow",
    description: "Comprehensive fire safety inspection checklist",
    questionsCount: 5,
  },
  {
    id: "emergency-exits",
    title: "Emergency Exits Verification",
    description: "Check signage, lighting and obstruction",
    questionsCount: 4,
  },
  {
    id: "equipment-room",
    title: "Equipment Room Compliance",
    description: "Ventilation, access and maintenance",
    questionsCount: 6,
  },
];
