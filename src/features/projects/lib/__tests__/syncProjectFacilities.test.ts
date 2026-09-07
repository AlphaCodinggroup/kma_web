/**
 * syncProjectFacilities: la asignación de facilities a un proyecto se escribe
 * sobre el project_id de cada facility, que es la única fuente de la relación.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateFacilityMock = vi.fn();

vi.mock("@features/facilities/lib/usecases/update-facility.usecase", () => ({
  updateFacilityUseCase: (...args: unknown[]) => updateFacilityMock(...args),
}));

const { syncProjectFacilities } = await import(
  "@features/projects/lib/syncProjectFacilities"
);

describe("syncProjectFacilities", () => {
  beforeEach(() => {
    updateFacilityMock.mockReset();
    updateFacilityMock.mockResolvedValue(undefined);
  });

  it("assigns the facilities of a new project", async () => {
    await syncProjectFacilities({
      projectId: "p-1",
      selectedIds: ["f-1", "f-2"],
    });

    expect(updateFacilityMock).toHaveBeenCalledTimes(2);
    expect(updateFacilityMock).toHaveBeenCalledWith({
      id: "f-1",
      projectId: "p-1",
    });
    expect(updateFacilityMock).toHaveBeenCalledWith({
      id: "f-2",
      projectId: "p-1",
    });
  });

  it("only writes the difference", async () => {
    await syncProjectFacilities({
      projectId: "p-1",
      selectedIds: ["f-1", "f-3"],
      previousIds: ["f-1", "f-2"],
    });

    // f-1 ya estaba: no se vuelve a escribir.
    expect(updateFacilityMock).toHaveBeenCalledTimes(2);
    expect(updateFacilityMock).toHaveBeenCalledWith({
      id: "f-3",
      projectId: "p-1",
    });
    // f-2 se destildó: queda sin proyecto.
    expect(updateFacilityMock).toHaveBeenCalledWith({
      id: "f-2",
      projectId: null,
    });
  });

  it("writes nothing when the selection did not change", async () => {
    await syncProjectFacilities({
      projectId: "p-1",
      selectedIds: ["f-1"],
      previousIds: ["f-1"],
    });

    expect(updateFacilityMock).not.toHaveBeenCalled();
  });

  it("unassigns every facility when the selection is emptied", async () => {
    await syncProjectFacilities({
      projectId: "p-1",
      selectedIds: [],
      previousIds: ["f-1", "f-2"],
    });

    expect(updateFacilityMock).toHaveBeenCalledTimes(2);
    expect(updateFacilityMock).toHaveBeenCalledWith({
      id: "f-1",
      projectId: null,
    });
  });

  it("requires a project id", async () => {
    await expect(
      syncProjectFacilities({ projectId: "  ", selectedIds: ["f-1"] })
    ).rejects.toThrow("projectId is required");

    expect(updateFacilityMock).not.toHaveBeenCalled();
  });

  it("propagates a failing write", async () => {
    updateFacilityMock.mockRejectedValue(new Error("update boom"));

    await expect(
      syncProjectFacilities({ projectId: "p-1", selectedIds: ["f-1"] })
    ).rejects.toThrow("update boom");
  });
});
