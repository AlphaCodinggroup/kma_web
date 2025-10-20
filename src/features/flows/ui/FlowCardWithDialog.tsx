"use client";

import * as React from "react";
import FlowCard, { type FlowCardProps } from "./FlowCard";
import FlowQuestionsDialog, { type FlowDetailVM } from "./FlowQuestionsDialog";

/**
 * Wrapper sin estilos: solo compone FlowCard + FlowQuestionsDialog
 * y maneja el estado de apertura del modal.
 */
export interface FlowCardWithDialogProps
  extends Omit<FlowCardProps, "onViewQuestions"> {
  /** Datos (por ahora de UI) para renderizar el modal */
  flow: FlowDetailVM;
  dialogTestId?: string;
}

export const FlowCardWithDialog: React.FC<FlowCardWithDialogProps> = ({
  flow,
  dialogTestId,
  ...cardProps
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <FlowCard {...cardProps} onViewQuestions={() => setOpen(true)} />

      <FlowQuestionsDialog
        open={open}
        onOpenChange={setOpen}
        flow={flow}
        data-testid={dialogTestId ?? "flow-questions-dialog"}
      />
    </>
  );
};

export default FlowCardWithDialog;
