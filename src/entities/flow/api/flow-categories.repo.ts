import type {
  CreateFlowCategoryInput,
  FlowCategory,
  FlowCategoryId,
  FlowCategoryList,
  UpdateFlowCategoryInput,
} from "../model";

/**
 * Contrato de acceso a datos de categorías de Flows.
 */
export interface FlowCategoriesRepo {
  list(options?: { active?: boolean | undefined }): Promise<FlowCategoryList>;
  getById(id: FlowCategoryId): Promise<FlowCategory | null>;
  create(input: CreateFlowCategoryInput): Promise<FlowCategory>;
  update(id: FlowCategoryId, input: UpdateFlowCategoryInput): Promise<FlowCategory>;
  delete(id: FlowCategoryId, options?: { permanent?: boolean | undefined }): Promise<void>;
}
