import type {
  Flow,
  FlowList,
  FlowStep,
  QuestionStep,
  FormStep,
  SelectStep,
  EndStep,
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
function mapQuestionStep(dto: QuestionStepDTO): QuestionStep {
  return {
    id: dto.id,
    type: "Question",
    text: dto.text,
    yesNext: dto.yes_next ?? "",
    noNext: dto.no_next ?? "",
    barrierId: dto.barrier_id ?? "",
    image: dto.image ?? "",
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
    title: dto.title,
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
    options: dto.options.map((o) => ({ label: o.label, next: o.next })),
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
    isActive: dto.is_active ?? false,
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
