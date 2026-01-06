import type {
  Flow,
  FlowList,
  FlowStep,
  QuestionStep,
  FormStep,
  SelectStep,
  EndStep,
  Condition,
  ConditionalNext,
} from "../model";
import type {
  FlowDTO,
  FlowListDTO,
  FlowStepDTO,
  QuestionStepDTO,
  FormStepDTO,
  SelectStepDTO,
  EndStepDTO,
  FormFieldDTO,
} from "@features/flows/api/flows.dto";

/** ------------------------
 *  Pasos: DTO -> Dominio
 *  -----------------------*/
function mapConditionDTO(dto: any): Condition {
  return {
    step_id: dto.step_id,
    answer: dto.answer,
    selected_option: dto.selected_option,
  };
}

function mapConditionalNextDTO(dto: any): ConditionalNext {
  return {
    conditions: dto.conditions.map(mapConditionDTO),
    next: dto.next,
    match_any: dto.match_any,
  };
}

function mapQuestionStep(dto: QuestionStepDTO): QuestionStep {
  return {
    id: dto.id,
    type: "Question",
    text: dto.text,
    yesNext: dto.yes_next ?? "",
    noNext: dto.no_next ?? "",
    barrierId: dto.barrier_id ?? "",
    image: dto.image ?? "",
    conditionalYesNext: dto.conditional_yes_next ? mapConditionalNextDTO(dto.conditional_yes_next) : undefined,
    conditionalNoNext: dto.conditional_no_next ? mapConditionalNextDTO(dto.conditional_no_next) : undefined,
  };
}

function mapFormField(dto: FormFieldDTO): FormStep["fields"][number] {
  return {
    id: dto.id,
    type: dto.type, // "text" | "number" | "photo" | "button"
    label: dto.label,
    unit: dto.unit ?? "",
    placeholder: dto.placeholder ?? "",
  };
}

function mapFormStep(dto: FormStepDTO): FormStep {
  return {
    id: dto.id,
    type: "Form",
    title: dto.title ?? "",
    next: dto.next ?? "",
    barrierId: dto.barrier_id ?? "",
    fields: dto.fields.map(mapFormField),
  };
}

function mapSelectStep(dto: SelectStepDTO): SelectStep {
  return {
    id: dto.id,
    type: "Select",
    title: dto.title ?? "", // puede venir undefined; mantenemos ambos campos
    text: dto.text ?? "",
    options: dto.options.map((o) => ({ label: o.label, next: o.next, barrierId: o.barrier_id ?? undefined })),
    next: dto.next ?? "",
  };
}

function mapEndStep(dto: EndStepDTO): EndStep {
  return {
    id: dto.id,
    type: "End",
  };
}

export function mapFlowStepDTO(dto: FlowStepDTO): FlowStep {
  switch (dto.type) {
    case "Question":
      return mapQuestionStep(dto);
    case "Form":
      return mapFormStep(dto);
    case "Select":
      return mapSelectStep(dto);
    case "End":
      return mapEndStep(dto);
    default: {
      // Exhaustivo por seguridad en TS
      const _exhaustive: never = dto;
      return _exhaustive;
    }
  }
}

/** ------------------------
 *  Flow: DTO -> Dominio
 *  -----------------------*/
export function mapFlowDTO(dto: FlowDTO): Flow {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? null,
    steps: dto.steps.map(mapFlowStepDTO),
    flowType: dto.flow_type ?? null,
    version: dto.version,
    isActive: dto.is_active ?? true,
    createdAt: dto.created_at ?? "",
    updatedAt: dto.updated_at ?? "",
  };
}

export function mapFlowListDTO(dto: FlowListDTO): FlowList {
  return {
    flows: dto.flows.map(mapFlowDTO),
    total: dto.total,
    limit: dto.limit,
    offset: dto.offset,
  };
}

/** ------------------------
 *  Flow: Dominio -> DTO
 *  -----------------------*/
function mapConditionToDTO(condition: Condition): any {
  return {
    step_id: condition.step_id,
    answer: condition.answer,
    selected_option: condition.selected_option,
  };
}

function mapConditionalNextToDTO(conditional: ConditionalNext): any {
  return {
    conditions: conditional.conditions.map(mapConditionToDTO),
    next: conditional.next,
    match_any: conditional.match_any,
  };
}

function mapQuestionStepToDTO(step: QuestionStep): QuestionStepDTO {
  return {
    id: step.id,
    type: "Question",
    text: step.text,
    yes_next: step.yesNext || undefined,
    no_next: step.noNext || undefined,
    barrier_id: step.barrierId || undefined,
    image: step.image || undefined,
    conditional_yes_next: step.conditionalYesNext ? mapConditionalNextToDTO(step.conditionalYesNext) : undefined,
    conditional_no_next: step.conditionalNoNext ? mapConditionalNextToDTO(step.conditionalNoNext) : undefined,
  };
}

function mapFormFieldToDTO(field: FormStep["fields"][number]): FormFieldDTO {
  return {
    id: field.id,
    type: field.type,
    label: field.label,
    unit: field.unit || undefined,
    placeholder: field.placeholder || undefined,
  };
}

function mapFormStepToDTO(step: FormStep): FormStepDTO {
  return {
    id: step.id,
    type: "Form",
    title: step.title,
    next: step.next || undefined,
    barrier_id: step.barrierId || undefined,
    fields: step.fields.map(mapFormFieldToDTO),
    image: step.image || undefined,
  };
}

function mapSelectStepToDTO(step: SelectStep): SelectStepDTO {
  return {
    id: step.id,
    type: "Select",
    title: step.title || undefined,
    text: step.text || undefined,
    options: step.options.map((o) => ({ label: o.label, next: o.next, barrier_id: o.barrierId })),
    next: step.next || undefined,
    image: step.image || undefined,
  };
}

function mapEndStepToDTO(step: EndStep): EndStepDTO {
  return {
    id: step.id,
    type: "End",
    image: step.image || undefined,
  };
}

export function mapFlowStepToDTO(step: FlowStep): FlowStepDTO {
  switch (step.type) {
    case "Question":
      return mapQuestionStepToDTO(step);
    case "Form":
      return mapFormStepToDTO(step);
    case "Select":
      return mapSelectStepToDTO(step);
    case "End":
      return mapEndStepToDTO(step);
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

export function mapFlowToDTO(flow: Flow): FlowDTO {
  return {
    id: flow.id,
    title: flow.title,
    description: flow.description || undefined,
    steps: flow.steps.map(mapFlowStepToDTO),
    flow_type: flow.flowType || "Navigation",
    version: flow.version,
    is_active: flow.isActive,
    updated_at: flow.updatedAt,
  };
}
