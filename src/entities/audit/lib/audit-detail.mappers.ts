import type {
  AuditDetail,
  AuditQuestion,
  AuditAttachment,
  AuditReportItem,
  AuditComment,
  AuditQuestionType,
  ReportSeverity,
} from "@entities/audit/model/audit-detail";
import type { AuditStatus, IsoDateString } from "@entities/audit/model";

export type AuditDetailDTO = {
  id: string;
  flow_id?: string;
  flowId?: string;
  flow_name?: string | null;
  flow_version?: number;
  flowVersion?: number;
  project_id?: string | null;
  projectId?: string | null;
  facility_id?: string | null;
  facilityId?: string | null;
  status: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  project_name?: string | null;
  auditor_name?: string | null;
  auditor?: string | null;
  facility_name?: string | null;
  audit_date?: string | null;
  auditDate?: string | null;
  completed_date?: string | null;
  completedDate?: string | null;
  answers?: AnswerDTO[];
  steps?: StepDTO[];
  questions?: AuditQuestionDTO[];
  report_items?: AuditReportItemDTO[];
  reportItems?: AuditReportItemDTO[];
  comments?: AuditCommentDTO[];
};

export type AuditQuestionDTO = {
  id: string;
  type?: string;
  text?: string;
  answer?: string | number | boolean | null;
  response?: string | number | boolean | null;
  notes?: string | null;
  comments?: string | null;
  attachments?: AuditAttachmentDTO[];
  code?: string;
  question_code?: string;
  order?: number;
};

export type AuditAttachmentDTO = {
  id: string;
  name?: string | null;
  filename?: string | null;
  url?: string | null;
  path?: string | null;
  mime?: string | null;
  content_type?: string | null;
};

export type AuditReportItemDTO = {
  id: string;
  title?: string | null;
  severity?: string | null;
  photos?: string[] | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  unitPrice?: number | string | null;
  total?: number | string | null;
};

export type AuditCommentDTO = {
  id: string;
  item_id?: string | null;
  itemId?: string | null;
  report_item_id?: string | null;
  text?: string | null;
  page?: number | string | null;
  created_at?: string | null;
  createdAt?: string | null;
  author?: string | null;
  user?: string | null;
};

export type AnswerDTO = {
  step_id: string;
  type: string;
  answer?: string | number | boolean | null;
  values?: Record<string, unknown>;
};

export type StepDTO = {
  id: string;
  type?: string;
  text?: string;
  title?: string;
  answer?: AnswerDTO;
};

const emptyToNull = (v?: string | null): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const toIso = (v?: string | null, fallback?: string): IsoDateString => {
  const raw = (v ?? fallback ?? "").toString();
  return raw as IsoDateString;
};

const toNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return fallback;
};

const toAuditStatus = (raw?: string): AuditStatus => {
  const allowed: AuditStatus[] = [
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ];

  if (raw && allowed.includes(raw as AuditStatus)) {
    return raw as AuditStatus;
  }

  return (raw ?? "draft_report_pending_review") as AuditStatus;
};

const toYesNo = (
  raw: string | number | boolean | null | undefined
): boolean | string | number | null => {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const val = raw.trim().toUpperCase();
    if (val === "YES" || val === "SI" || val === "TRUE") return true;
    if (val === "NO" || val === "FALSE") return false;
    return raw;
  }
  return raw ?? null;
};

const toQuestionType = (raw?: string): AuditQuestionType => {
  const type = (raw ?? "").toLowerCase();
  if (type === "yes_no" || type === "question") return "yes_no";
  if (type === "multiple_choice" || type === "select") return "multiple_choice";
  if (type === "number") return "number";
  if (type === "text" || type === "form") return "text";
  return "text";
};

const toSeverity = (raw?: string | null): ReportSeverity => {
  const sev = (raw ?? "").toLowerCase();
  if (sev === "high" || sev === "medium" || sev === "low") {
    return sev;
  }
  return "low";
};

const mapAttachmentDTO = (dto: AuditAttachmentDTO): AuditAttachment => {
  return {
    id: dto.id,
    name: dto.name ?? dto.filename ?? "Attachment",
    url: dto.url ?? dto.path ?? "",
    mime: dto.mime ?? dto.content_type ?? null,
  };
};

export const mapAuditQuestionDTO = (dto: AuditQuestionDTO): AuditQuestion => {
  const answer = dto.answer !== undefined ? dto.answer : dto.response ?? null;

  const base: AuditQuestion = {
    id: dto.id,
    type: toQuestionType(dto.type),
    text: dto.text ?? "",
    answer: toYesNo(answer),
    notes: dto.notes ?? dto.comments ?? null,
    attachments: Array.isArray(dto.attachments)
      ? dto.attachments.map(mapAttachmentDTO)
      : [],
  };

  const code = dto.code ?? dto.question_code;
  if (code) {
    base.code = code;
  }
  if (typeof dto.order === "number") {
    base.order = dto.order;
  }

  return base;
};

export const mapAuditReportItemDTO = (
  dto: AuditReportItemDTO
): AuditReportItem => {
  const quantity = toNumber(dto.quantity, 0);
  const unitPrice = toNumber(dto.unit_price ?? dto.unitPrice, 0);
  const total = toNumber(dto.total, quantity * unitPrice);

  return {
    id: dto.id,
    title: dto.title ?? "",
    severity: toSeverity(dto.severity),
    photos: Array.isArray(dto.photos)
      ? dto.photos.filter((p): p is string => typeof p === "string")
      : [],
    quantity,
    unitPrice,
    total,
  };
};

export const mapAuditCommentDTO = (dto: AuditCommentDTO): AuditComment => {
  const page =
    dto.page == null ? null : toNumber(dto.page as number | string);

  return {
    id: dto.id,
    itemId: dto.item_id ?? dto.itemId ?? dto.report_item_id ?? "",
    text: dto.text ?? "",
    ...(page === null ? {} : { page }),
    createdAt: toIso(dto.created_at ?? dto.createdAt),
    author: dto.author ?? dto.user ?? "",
  };
};

function deriveAnswerByStep(answers?: AnswerDTO[]): Map<string, AnswerDTO> {
  const map = new Map<string, AnswerDTO>();
  if (!Array.isArray(answers)) return map;
  answers.forEach((ans) => {
    if (ans?.step_id) {
      map.set(ans.step_id, ans);
    }
  });
  return map;
}

function toAttachmentsFromPhotos(
  photos?: unknown[],
  code?: string
): AuditAttachment[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .map((p, idx) => ({
      id: `${code ?? "photo"}-${idx}`,
      name: p.split("/").pop() || `photo-${idx + 1}`,
      url: p,
      mime: null,
    }));
}

function mapStepToQuestion(
  step: StepDTO,
  idx: number,
  answersMap: Map<string, AnswerDTO>
): AuditQuestion {
  const stepAnswer = step.answer ?? answersMap.get(step.id);
  const values = (stepAnswer?.values ?? {}) as Record<string, unknown>;

  const rawAnswer =
    stepAnswer?.answer ??
    (values && "answer" in values ? (values as any).answer : undefined) ??
    (values && "measurements" in values
      ? (values as any).measurements
      : undefined) ??
    (values && "quantity" in values ? (values as any).quantity : undefined) ??
    null;

  const notes = (values as any).notes ?? (values as any).comments;

  const photos = (values as any).photos;

  const attachments = toAttachmentsFromPhotos(photos, step.id);

  const type = toQuestionType(step.type);

  return {
    id: step.id,
    type,
    text: step.text ?? step.title ?? "",
    answer: toYesNo(rawAnswer),
    notes: typeof notes === "string" ? notes : null,
    attachments,
    code: step.id,
    order: idx + 1,
  };
}

/**
 * Mapea el DTO de detalle de auditoria (GET /audits/{id}) a dominio.
 */
export const mapAuditDetailDTOToDomain = (dto: AuditDetailDTO): AuditDetail => {
  const completedRaw = dto.completed_date ?? dto.completedDate ?? null;
  const reportItems = dto.report_items ?? dto.reportItems;
  const answersMap = deriveAnswerByStep(dto.answers);

  const questionsFromSteps = Array.isArray(dto.steps)
    ? dto.steps.map((s, idx) => mapStepToQuestion(s, idx, answersMap))
    : undefined;
  const questionsFromDto = Array.isArray(dto.questions)
    ? dto.questions.map(mapAuditQuestionDTO)
    : undefined;

  return {
    id: dto.id,
    flowId: dto.flow_id ?? dto.flowId ?? "",
    flowName: dto.flow_name ?? null,
    version: toNumber(dto.flow_version ?? dto.flowVersion, 1),
    projectId: emptyToNull(dto.project_id ?? dto.projectId),
    facilityId: emptyToNull(dto.facility_id ?? dto.facilityId),
    projectName: dto.project_name ?? null,
    auditorName: dto.auditor_name ?? dto.auditor ?? null,
    facilityName: dto.facility_name ?? null,
    status: toAuditStatus(dto.status),
    auditDate: toIso(
      dto.audit_date ?? dto.auditDate ?? dto.created_at,
      dto.created_at ?? undefined
    ),
    completedDate:
      completedRaw === undefined
        ? null
        : completedRaw === null
        ? null
        : toIso(completedRaw),
    createdAt: dto.created_at ? toIso(dto.created_at) : null,
    updatedAt: dto.updated_at ? toIso(dto.updated_at) : null,
    questions: questionsFromSteps ?? questionsFromDto ?? [],
    reportItems: Array.isArray(reportItems)
      ? reportItems.map(mapAuditReportItemDTO)
      : [],
    comments: Array.isArray(dto.comments)
      ? dto.comments.map(mapAuditCommentDTO)
      : [],
  };
};
