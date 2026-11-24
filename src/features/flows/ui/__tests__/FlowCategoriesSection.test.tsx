import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMock = vi.fn();
vi.mock("@processes/auth/hooks", () => ({ useSession: () => sessionMock() }));

import { FlowCategoriesSection } from "../FlowCategoriesSection";
import type { FlowCategory } from "@entities/flow/model";

const CATEGORIES: FlowCategory[] = [
  { id: "cat-1", name: "Restrooms", description: "Restroom flows", isActive: true },
  { id: "cat-2", name: "Archived Area", description: "", isActive: false },
];

describe("FlowCategoriesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({ isAdmin: true });
  });

  it("renders categories with status badges and invokes edit handler", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <FlowCategoriesSection items={CATEGORIES} onEdit={onEdit} onDelete={onDelete} />
    );

    expect(screen.getByText("Restrooms")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Archived Area")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit category Restrooms" }));
    expect(onEdit).toHaveBeenCalledWith(CATEGORIES[0]);
  });

  it("soft-deletes an active category and permanently deletes an inactive one", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <FlowCategoriesSection items={CATEGORIES} onEdit={vi.fn()} onDelete={onDelete} />
    );

    await user.click(screen.getByRole("button", { name: "Deactivate category Restrooms" }));
    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(onDelete).toHaveBeenCalledWith(CATEGORIES[0], false);

    await user.click(screen.getByRole("button", { name: "Delete category Archived Area" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(CATEGORIES[1], true);
  });

  it("surfaces delete errors inside the confirm dialog", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error("Delete failed"));

    render(
      <FlowCategoriesSection items={[CATEGORIES[0]]} onEdit={vi.fn()} onDelete={onDelete} />
    );

    await user.click(screen.getByRole("button", { name: "Deactivate category Restrooms" }));
    await user.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Delete failed")).toBeInTheDocument();
  });

  it("disables edit and delete buttons for non-admins", () => {
    sessionMock.mockReturnValue({ isAdmin: false });

    render(
      <FlowCategoriesSection items={[CATEGORIES[0]]} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Edit category Restrooms" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deactivate category Restrooms" })).toBeDisabled();
  });
});
