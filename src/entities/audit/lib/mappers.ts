import type {
  Audit,
  AuditAnswer,
  AuditStatus,
  AnswerType,
  AnswerValue,
  IsoDateString,
} from "@entities/audit/model";

type BaseAnswerDTO = {
  step_id: string;
  type: "Question" | "Form" | "Select";
};

type QuestionAnswerDTO = BaseAnswerDTO & {
  type: "Question";
  answer?: string;
  values?: AnswerValue;
};

type FormAnswerDTO = BaseAnswerDTO & {
  type: "Form";
  values?: AnswerValue;
};

type SelectAnswerDTO = BaseAnswerDTO & {
  type: "Select";
  answer?: string;
};

type AuditAnswerDTO = QuestionAnswerDTO | FormAnswerDTO | SelectAnswerDTO;

export type AuditDTO = {
  id: string;
  version: number;
  flow_id: string;
  project_id?: string | null;
  facility_id?: string | null;
  status: string;
  answers: AuditAnswerDTO[];
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AuditsResponseDTO = {
  audits: AuditDTO[];
};

const emptyToNull = (v?: string | null): string | null => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};

const toIsoOrEmpty = (v?: string | null): IsoDateString => {
  const s = (v ?? "").trim();
  return s as IsoDateString; // si viene vacío lo dejamos vacío
};

/** ========= Answer mapping ========= */

const mapAnswerType = (t: string): AnswerType => {
  const s = (t ?? "").trim();
  if (s === "Form" || s === "Select" || s === "Question") return s;
  return "Question"; // fallback defensivo
};

const mapAnswerDtoToDomain = (dto: AuditAnswerDTO): AuditAnswer => {
  const base = {
    stepId: dto.step_id,
    type: mapAnswerType(dto.type),
  } as const;

  switch (dto.type) {
    case "Question":
      return {
        ...base,
        type: "Question",
        answer: dto.answer,
        values: dto.values,
      };
    case "Form":
      return {
        ...base,
        type: "Form",
        values: dto.values,
      };
    case "Select":
      return {
        ...base,
        type: "Select",
        answer: dto.answer,
      };
    default:
      return {
        ...base,
        type: "Question",
      };
  }
};

/** ========= Audit mapping ========= */

export const mapAuditDtoToDomain = (dto: AuditDTO): Audit => {
  return {
    id: dto.id,
    version: dto.version,
    flowId: dto.flow_id ?? "",
    projectId: emptyToNull(dto.project_id),
    facilityId: emptyToNull(dto.facility_id),
    status: (dto.status ?? "") as AuditStatus,
    answers: Array.isArray(dto.answers)
      ? dto.answers.map(mapAnswerDtoToDomain)
      : [],
    createdBy: emptyToNull(dto.created_by),
    updatedBy: emptyToNull(dto.updated_by),
    createdAt: toIsoOrEmpty(dto.created_at),
    updatedAt: toIsoOrEmpty(dto.updated_at),
  };
};

/**
 * Mapea { audits: AuditDTO[] } → Audit[]
 * Reutilizable en el repo para el GET /audits.
 */
export const mapAuditsResponseToDomain = (res: AuditsResponseDTO): Audit[] => {
  const items = Array.isArray(res?.audits) ? res.audits : [];
  return items.map(mapAuditDtoToDomain);
};
