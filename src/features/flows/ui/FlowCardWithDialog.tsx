"use client";

import React, { useMemo, useState } from "react";
import FlowCard, { type FlowCardProps } from "./FlowCard";
import FlowQuestionsDialog, { type FlowDetailVM } from "./FlowQuestionsDialog";
import { useFlowById } from "@features/flows/lib/useFlowsQuery";
import { mapFlowToDialogVM } from "./adapters/mapFlowToDialogVM";

/**
 * Reemplaza datos mock por datos reales del backend.
 * - Usa @tanstack/react-query para leer el catálogo cacheado.
 * - Mapea Flow (dominio) -> FlowDetailVM (UI del modal).
 * - No modifica estilos existentes.
 */
export interface FlowCardWithDialogDataProps
  extends Omit<FlowCardProps, "onViewQuestions"> {
  /** ID real del flow (coincide con el provisto por la API). */
  flowId: string;
  /** Opcional: ajustes de mapeo (p.ej., incluir Forms como items informativos). */
  mapOptions?: { includeForms?: boolean };
  dialogTestId?: string;
}

export const FlowCardWithDialog: React.FC<FlowCardWithDialogDataProps> = ({
  flowId,
  mapOptions,
  dialogTestId,
  ...cardProps
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const { flow, isLoading, error } = useFlowById(flowId, open);


  // Fallback visual mínimo mientras carga/errores.
  const placeholder: FlowDetailVM = useMemo(
    () => ({
      title: cardProps.title,
      description: isLoading
        ? "Loading…"
        : error
          ? error.status === 401
            ? "Unauthorized"
            : "Failed to load"
          : cardProps.description ?? "",
      questions: [],
    }),
    [cardProps.title, cardProps.description, isLoading, error]
  );

  const detail: FlowDetailVM = useMemo(() => {
    if (!flow) return placeholder;
    return mapFlowToDialogVM(flow, mapOptions);
  }, [flow, mapOptions, placeholder]);
  return (
    <>
      <FlowCard {...cardProps} flowId={flowId} onViewQuestions={() => setOpen(true)} />

      <FlowQuestionsDialog
        open={open}
        onOpenChange={setOpen}
        flow={detail}
        data-testid={dialogTestId ?? "flow-questions-dialog"}
      />
    </>
  );
};

export default FlowCardWithDialog;
