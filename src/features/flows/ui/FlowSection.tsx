"use client";

import * as React from "react";
import FlowCardWithDialog from "./FlowCardWithDialog";
import type { FlowDetailVM } from "./FlowQuestionsDialog";
import { makeDummyFlowDetail } from "./fixtures";

export interface FlowItemVM {
  id: string;
  title: string;
  description?: string;
  questionsCount: number;
}

export interface FlowsSectionProps {
  /** Lista de flows a mostrar (por ahora sólo visual). */
  items: FlowItemVM[];
  className?: string;
  "data-testid"?: string;
}

/**
 * Sección de catálogo de Flows
 * - Reutiliza FlowCard existente (sin cambiar estilos).
 * - Enlaza cada card con FlowQuestionsDialog vía FlowCardWithDialog.
 * - Por ahora usa datos dummy para el contenido del modal.
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
          // Sólo visual: generamos un FlowDetailVM dummy para el modal
          const flowDetail: FlowDetailVM = makeDummyFlowDetail({
            title: it.title,
            description: it.description,
            questionsCount: it.questionsCount,
          });

          return (
            <FlowCardWithDialog
              key={it.id}
              title={it.title}
              description={it.description}
              questionsCount={it.questionsCount}
              data-testid={`flow-card-${it.id}`}
              flow={flowDetail}
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
