import { z } from "zod";

// -- Steps
export const StepBaseDTOSchema = z.object({
  id: z.string(),
  type: z.enum(["Question", "Form", "Select", "End"]),
  image: z.string().optional(),
});

export const QuestionStepDTOSchema = StepBaseDTOSchema.extend({
  type: z.literal("Question"),
  text: z.string(),
  yes_next: z.string().optional(),
  no_next: z.string().optional(),
  barrier_id: z.string().optional(),
});

export const FormFieldDTOSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "number", "photo", "button"]),
  label: z.string(),
  placeholder: z.string().optional(),
  unit: z.string().optional(),
});

export const FormStepDTOSchema = StepBaseDTOSchema.extend({
  type: z.literal("Form"),
  title: z.string(),
  next: z.string().optional(),
  barrier_id: z.string().optional(),
  fields: z.array(FormFieldDTOSchema),
});

export const SelectOptionDTOSchema = z.object({
  label: z.string(),
  next: z.string(),
});

export const SelectStepDTOSchema = StepBaseDTOSchema.extend({
  type: z.literal("Select"),
  // En la API puede venir `title` o `text` según el caso.
  title: z.string().optional(),
  text: z.string().optional(),
  options: z.array(SelectOptionDTOSchema),
  next: z.string().optional(),
});

export const EndStepDTOSchema = StepBaseDTOSchema.extend({
  type: z.literal("End"),
});

export const FlowStepDTOSchema = z.discriminatedUnion("type", [
  QuestionStepDTOSchema,
  FormStepDTOSchema,
  SelectStepDTOSchema,
  EndStepDTOSchema,
]);

// -- Flow
export const FlowDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  steps: z.array(FlowStepDTOSchema),
  flow_type: z.string().optional(),
  version: z.number(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const FlowListDTOSchema = z.object({
  flows: z.array(FlowDTOSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// ===============================
// Tipos inferidos (para DX/TS)
// ===============================
export type FlowListDTO = z.infer<typeof FlowListDTOSchema>;
export type FlowDTO = z.infer<typeof FlowDTOSchema>;
export type FlowStepDTO = z.infer<typeof FlowStepDTOSchema>;
export type QuestionStepDTO = z.infer<typeof QuestionStepDTOSchema>;
export type FormStepDTO = z.infer<typeof FormStepDTOSchema>;
export type SelectStepDTO = z.infer<typeof SelectStepDTOSchema>;
export type EndStepDTO = z.infer<typeof EndStepDTOSchema>;
export type FormFieldDTO = z.infer<typeof FormFieldDTOSchema>;

// ===============================
// Helpers de validación
// ===============================
export function parseFlowListDTO(input: unknown): FlowListDTO {
  return FlowListDTOSchema.parse(input);
}
