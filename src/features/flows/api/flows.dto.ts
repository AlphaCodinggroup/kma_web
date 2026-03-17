import { z } from "zod";

// -- Conditional Navigation
export const ConditionDTOSchema = z.object({
  step_id: z.string(),
  // Aceptamos minúsculas y transformamos a mayúsculas
  answer: z.enum(["YES", "NO", "yes", "no"]).transform((v) => v.toUpperCase() as "YES" | "NO").optional(),
  selected_option: z.string().optional(),
});

export const ConditionalNextDTOSchema = z.object({
  conditions: z.array(ConditionDTOSchema),
  next: z.string(),
  match_any: z.boolean().optional(),
});

// -- Metadata
export const SharedQuantityMetadataDTOSchema = z.object({
  applies_to_barriers: z.array(z.string()),
});

export const StepMetadataDTOSchema = z.object({
  shared_quantity: SharedQuantityMetadataDTOSchema.optional(),
});

// -- Steps
export const StepBaseDTOSchema = z.object({
  id: z.string(),
  type: z.enum(["Question", "Form", "Select", "End"]),
  image: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  metadata: StepMetadataDTOSchema.optional().nullable(),
});

export const QuestionStepDTOSchema = StepBaseDTOSchema.extend({
  type: z.literal("Question"),
  text: z.string(),
  yes_next: z.string().optional().nullable(),
  no_next: z.string().optional().nullable(),
  barrier_id: z.string().optional().nullable(),
  conditional_yes_next: ConditionalNextDTOSchema.optional().nullable(),
  conditional_no_next: ConditionalNextDTOSchema.optional().nullable(),
});

export const FormFieldDTOSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "number", "photo", "button"]),
  label: z.string(),
  placeholder: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
});

export const FormStepDTOSchema = StepBaseDTOSchema.extend({
  type: z.literal("Form"),
  title: z.string().optional().nullable(),
  next: z.string().optional().nullable(),
  barrier_id: z.string().optional().nullable(),
  fields: z.array(FormFieldDTOSchema).optional().default([]),
});

export const SelectOptionDTOSchema = z.object({
  label: z.string(),
  next: z.string(),
  barrier_id: z.string().optional().nullable(),
});

export const SelectStepDTOSchema = StepBaseDTOSchema.extend({
  type: z.literal("Select"),
  // En la API puede venir `title` o `text` según el caso, y pueden ser null
  title: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  options: z.array(SelectOptionDTOSchema),
  next: z.string().optional().nullable(),
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
  description: z.string().optional().nullable(),
  steps: z.array(FlowStepDTOSchema),
  flow_type: z.string().optional().nullable(),
  version: z.number(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// -- Flow Item for List (Relaxed Validation)
export const FlowListItemDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  // En el listado solo necesitamos saber el tipo para contar las preguntas.
  // Permitimos passthrough para no romper si faltan campos de detalle.
  steps: z.array(
    z.object({
      type: z.enum(["Question", "Form", "Select", "End"]),
    }).passthrough()
  ),
  flow_type: z.string().optional().nullable(),
  version: z.number().optional().default(0),
  is_active: z.boolean().optional(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
}).passthrough();

export const FlowListDTOSchema = z.object({
  flows: z.array(FlowListItemDTOSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// ===============================
// Tipos inferidos (para DX/TS)
// ===============================
export type FlowListDTO = z.infer<typeof FlowListDTOSchema>;
export type FlowDTO = z.infer<typeof FlowDTOSchema>;
export type FlowListItemDTO = z.infer<typeof FlowListItemDTOSchema>;
export type FlowStepDTO = z.infer<typeof FlowStepDTOSchema>;
export type QuestionStepDTO = z.infer<typeof QuestionStepDTOSchema>;
export type FormStepDTO = z.infer<typeof FormStepDTOSchema>;
export type SelectStepDTO = z.infer<typeof SelectStepDTOSchema>;
export type EndStepDTO = z.infer<typeof EndStepDTOSchema>;
export type FormFieldDTO = z.infer<typeof FormFieldDTOSchema>;
export type StepMetadataDTO = z.infer<typeof StepMetadataDTOSchema>;
export type SharedQuantityMetadataDTO = z.infer<typeof SharedQuantityMetadataDTOSchema>;

// ===============================
// Helpers de validación
// ===============================
export function parseFlowListDTO(input: unknown): FlowListDTO {
  return FlowListDTOSchema.parse(input);
}
