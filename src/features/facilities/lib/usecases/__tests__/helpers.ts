// ---------------------------------------------------------------------------
// Fixtures compartidos por los tests de los casos de uso de Facilities.
// No es un archivo de test: sólo construye dobles y datos de dominio.
// ---------------------------------------------------------------------------

import { vi } from "vitest";
import type { Facility } from "@entities/facility/model";
import type {
  FacilitiesRepo,
  FacilityUploadSignature,
} from "@entities/facility/api/facilities.repo";

/** Facility de dominio con valores por defecto sobreescribibles. */
export function makeFacility(overrides: Partial<Facility> = {}): Facility {
  return {
    id: "facility-1",
    projectId: "project-1",
    name: "Facility 1",
    status: "ACTIVE",
    userIds: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    createdBy: "user-1",
    ...overrides,
  };
}

/** Firma de subida devuelta por el backend. */
export function makeSignature(
  overrides: Partial<FacilityUploadSignature> = {}
): FacilityUploadSignature {
  return {
    uploadUrl: "https://uploads.test/signed",
    key: "facilities/photo.png",
    expiresIn: 900,
    ...overrides,
  };
}

/** Doble del puerto de dominio con todos los métodos mockeados. */
export function makeFacilitiesRepo(
  overrides: Partial<FacilitiesRepo> = {}
): FacilitiesRepo {
  return {
    getFacilities: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    getUploadSignedUrl: vi.fn(),
    uploadFile: vi.fn(),
    ...overrides,
  };
}

/** File mínimo para ejercitar las ramas de subida de foto. */
export function makeFile(name = "photo.png", type = "image/png"): File {
  return new File(["binary"], name, { type });
}
