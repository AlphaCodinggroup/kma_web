import type { Flow, FlowId, FlowList } from "../model";

/**
 * Contrato de acceso a datos de Flows.
 * - No depende de DTOs ni de axios/fetch (pure domain).
 * - La implementación concreta vive en features/flows/api/*.impl.ts
 */
export interface FlowsRepo {
  /**
   * Trae el catálogo de flows completo desde backend.
   * Puede aplicar paginación cuando la API lo soporte.
   */
  list(): Promise<FlowList>;

  /**
   * Devuelve un Flow por id (o null si no existe).
   * Implementación por defecto: reutilizar `list()` y seleccionar,
   * salvo que la API provea un GET /flows/:id (entonces se usa ese endpoint).
   */
  getById(id: FlowId): Promise<Flow | null>;

  /**
   * Obtiene una URL presignada para subir archivos.
   */
  getPresignedUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; publicUrl: string }>;

  /**
   * Sube un archivo a la URL presignada.
   */
  uploadFile(uploadUrl: string, file: File): Promise<void>;

  /**
   * Actualiza un Flow existente.
   */
  update(id: FlowId, flow: Flow): Promise<Flow>;
}

/** Identificador (token) útil para DI si usás contenedores o factories. */
export const FLOWS_REPO = "FLOWS_REPO";
