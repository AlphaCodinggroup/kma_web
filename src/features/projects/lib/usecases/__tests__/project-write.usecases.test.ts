import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ archive: vi.fn() }));
vi.mock("@features/projects/api/projects.repo.impl", () => ({
  projectsRepoImpl: { archive: mocks.archive },
}));

import { archiveProjectUseCase } from "../archive-project";
import { updateProject } from "../update-project";

describe("updateProject", () => {
  const repo = { update: vi.fn() } as never as Parameters<typeof updateProject>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    (repo.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
  });

  it("sends only the identifier when nothing else is provided", async () => {
    await updateProject(repo, { id: "p1" });
    expect(repo.update).toHaveBeenCalledWith({ id: "p1" });
  });

  it("trims every text field and forwards the collections", async () => {
    await updateProject(repo, {
      id: "p1",
      name: "  Project  ",
      code: "  P-1  ",
      description: "  Description  ",
      users: [{ id: "u1", name: "Ana" }],
      facilities: [{ id: "f1", name: "Plant" }],
      status: "ACTIVE",
    } as never);

    expect(repo.update).toHaveBeenCalledWith({
      id: "p1",
      name: "Project",
      code: "P-1",
      description: "Description",
      users: [{ id: "u1", name: "Ana" }],
      facilities: [{ id: "f1", name: "Plant" }],
      status: "ACTIVE",
    });
  });

  it("keeps an emptied text field so the caller can clear it", async () => {
    await updateProject(repo, { id: "p1", name: "   ", description: "" } as never);
    expect(repo.update).toHaveBeenCalledWith({ id: "p1", name: "", description: "" });
  });
});

describe("archiveProjectUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.archive.mockResolvedValue({ id: "p1", status: "ARCHIVED" });
  });

  it("trims the identifier before archiving", async () => {
    await expect(archiveProjectUseCase({ id: "  p1  " })).resolves.toMatchObject({ id: "p1" });
    expect(mocks.archive).toHaveBeenCalledWith("p1");
  });

  it("rejects a blank identifier", async () => {
    await expect(archiveProjectUseCase({ id: "   " })).rejects.toThrow(
      "Project id is required to archive a project",
    );
    expect(mocks.archive).not.toHaveBeenCalled();
  });
});
