/**
 * Dominio: Flow (encuesta/proceso con pasos)
 * No depende de DTOs ni de UI. Los mappers en features convierten desde/ hacia DTO.
 */

export type FlowId = string;

export interface Flow {
  id: FlowId;
  title: string;
  description?: string | null;
  steps: FlowStep[];
  flowType?: string | null; // p.ej. "Ramps"
  version: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** -----------------------
 *  Pasos del Flow (Dominio)
 *  ----------------------*/
export type FlowStep = QuestionStep | FormStep | SelectStep | EndStep;

export interface BaseStep {
  id: string;
  type: "Question" | "Form" | "Select" | "End";
  image?: string | null;
}

export interface QuestionStep extends BaseStep {
  type: "Question";
  text: string;
  yesNext?: string;
  noNext?: string;
  barrierId?: string;
}

export interface FormField {
  id: string;
  type: "text" | "number" | "photo" | "button";
  label: string;
  placeholder?: string;
  unit?: string;
}

export interface FormStep extends BaseStep {
  type: "Form";
  title: string;
  next?: string;
  barrierId?: string;
  fields: FormField[];
}

export interface SelectOption {
  label: string;
  next: string;
}

export interface SelectStep extends BaseStep {
  type: "Select";
  title?: string; // algunos vienen con title, otros con text
  text?: string;
  options: SelectOption[];
  next?: string; // por consistencia si el backend lo agregara en futuro
}

export interface EndStep extends BaseStep {
  type: "End";
}

/** -----------------------
 *  Respuestas de listado
 *  ----------------------*/
export interface FlowList {
  flows: Flow[];
  total: number;
  limit: number;
  offset: number;
}
