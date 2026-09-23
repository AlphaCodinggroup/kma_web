/**
 * Lookups del formulario de proyecto: auditores y facilities elegibles, y la
 * conversión de los ids elegidos al formato del dominio.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@entities/projects/model";

const useUsersQuery = vi.fn();
const useFacilitiesQuery = vi.fn();

vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({
  useUsersQuery: (...args: unknown[]) => useUsersQuery(...args),
}));
vi.mock("@features/facilities/ui/hooks/useFacilitiesQuery", () => ({
  useFacilitiesQuery: (...args: unknown[]) => useFacilitiesQuery(...args),
}));

import { useProjectFormLookups } from "../useProjectFormLookups";

const project = (facilities: Project["facilities"]): Project => ({
  id: "project-1",
  name: "Project 1",
  status: "ACTIVE",
  users: [],
  facilities,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  createdBy: "user-1",
});

beforeEach(() => {
  vi.clearAllMocks();
  useUsersQuery.mockReturnValue({
    data: {
      items: [
        { id: "u-1", name: "  Ada  ", email: "ada@example.com" },
        { id: "u-2", name: "", email: "bob@example.com" },
        { id: "u-3", name: "", email: "" },
      ],
    },
  });
  useFacilitiesQuery.mockReturnValue({
    data: { items: [{ id: "f-1", name: "House 1" }] },
  });
});

describe("useProjectFormLookups", () => {
  it("loads auditors and active facilities only when enabled", () => {
    renderHook(() => useProjectFormLookups({ enabled: false, projects: [] }));

    expect(useUsersQuery).toHaveBeenCalledWith({ role: "auditor" }, false);
    expect(useFacilitiesQuery).toHaveBeenCalledWith({ status: "ACTIVE" }, false);
  });

  it("adds the facilities of the projects to the options without repeating", () => {
    const { result } = renderHook(() =>
      useProjectFormLookups({
        enabled: true,
        projects: [
          project([
            { id: "f-1", name: "House 1 (project copy)" },
            { id: "f-9", name: "Archived depot" },
          ]),
        ],
      })
    );

    expect(result.current.facilityOptions).toEqual([
      { id: "f-1", name: "House 1" },
      { id: "f-9", name: "Archived depot" },
    ]);
  });

  it("returns empty lookups while nothing loaded", () => {
    useUsersQuery.mockReturnValue({ data: undefined });
    useFacilitiesQuery.mockReturnValue({ data: undefined });

    const { result } = renderHook(() =>
      useProjectFormLookups({ enabled: true, projects: [] })
    );

    expect(result.current.auditors).toEqual([]);
    expect(result.current.facilityOptions).toEqual([]);
  });

  it("maps auditor ids to project users, naming them by name, email or id", () => {
    const { result } = renderHook(() =>
      useProjectFormLookups({ enabled: true, projects: [] })
    );

    expect(result.current.toProjectUsers(["u-1", "u-2", "u-3", "missing"])).toEqual([
      { id: "u-1", name: "Ada" },
      { id: "u-2", name: "bob@example.com" },
      { id: "u-3", name: "u-3" },
    ]);
    expect(result.current.toProjectUsers(undefined)).toEqual([]);
  });

  it("maps facility ids to project facilities, dropping unknown ones", () => {
    const { result } = renderHook(() =>
      useProjectFormLookups({ enabled: true, projects: [] })
    );

    expect(result.current.toProjectFacilities(["f-1", "missing"])).toEqual([
      { id: "f-1", name: "House 1" },
    ]);
    expect(result.current.toProjectFacilities(undefined)).toEqual([]);
  });
});
