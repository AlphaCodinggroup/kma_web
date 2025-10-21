import type { FlowsRepo } from "@entities/flow/api/flows.repo";
import type { Flow, FlowId, FlowList } from "@entities/flow/model";
import { parseFlowListDTO } from "./flows.dto";
import { mapFlowListDTO } from "@entities/flow/lib/mappers";

/**
 * Error normalizado de API.
 */
export class FlowsApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FlowsApiError";
    if (typeof status === "number") {
      this.status = status;
    }
  }
}

const INTERNAL_API_URL = "/api/flows";

export class FlowsHttpRepo implements FlowsRepo {
  async list(): Promise<FlowList> {
    const res = await fetch(INTERNAL_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      // importante para no cachear el catálogo si cambia en backend
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new FlowsApiError("Unauthorized", 401);
      }
      const maybeJson = res.headers
        .get("content-type")
        ?.includes("application/json");
      if (maybeJson) {
        const body = (await res.json()) as unknown;
        const msg =
          (body &&
            typeof body === "object" &&
            "message" in body &&
            (body as any).message) ||
          "Upstream error";
        throw new FlowsApiError(String(msg), res.status);
      }
      const text = await res.text();
      throw new FlowsApiError(text || "Upstream error", res.status);
    }

    const raw = (await res.json()) as unknown;
    const dto = parseFlowListDTO(raw);
    const domain = mapFlowListDTO(dto);
    return domain;
  }

  async getById(id: FlowId): Promise<Flow | null> {
    // La API actual expone solo GET /flows (listado).
    // Estrategia: reutilizar list() y seleccionar el flow por id.
    // Si en el futuro se agrega GET /flows/:id, reemplazar por llamada directa.
    const list = await this.list();
    return list.flows.find((f) => f.id === id) ?? null;
  }
}

/** Instancia por defecto para inyección simple */
export const flowsRepo: FlowsRepo = new FlowsHttpRepo();
