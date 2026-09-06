import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Flow } from "@entities/flow/model";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  getPresignedUrl: vi.fn(),
  uploadFile: vi.fn(),
  invalidateQueries: vi.fn(),
  push: vi.fn(),
  isAdmin: true,
}));

vi.mock("@features/flows/api/flows.repo.impl", () => ({
  flowsRepo: {
    create: mocks.create,
    update: mocks.update,
    getPresignedUrl: mocks.getPresignedUrl,
    uploadFile: mocks.uploadFile,
  },
}));
vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  flowsKeys: {
    list: () => ["flows", "list"],
    detail: (id: string) => ["flows", "detail", id],
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({ isAdmin: mocks.isAdmin }),
}));

import { FlowEditor } from "./FlowEditor";

const flow: Flow = {
  id: "flow-1",
  title: "Accessibility flow",
  description: "Checks",
  version: 1,
  steps: [
    {
      id: "S1",
      type: "Select",
      title: "Choose area",
      options: [{ label: "Lobby", next: "Q1", barrierId: "BS" }],
    },
    {
      id: "Q1",
      type: "Question",
      text: "Is it accessible?",
      yesNext: "F1",
      noNext: "E1",
      barrierId: "BQ",
      conditionalYesNext: {
        next: "F1",
        conditions: [{ step_id: "S1", selected_option: "Lobby" }],
      },
    },
    {
      id: "F1",
      type: "Form",
      title: "Record finding",
      next: "E1",
      fields: [
        { id: "quantity", type: "number", label: "Quantity" },
        { id: "measurements-1", type: "number", label: "Width", unit: "cm" },
        { id: "photo", type: "photo", label: "Photo" },
        { id: "notes", type: "text", label: "Notes", placeholder: "Details" },
      ],
    },
    { id: "E1", type: "End" },
  ],
};

describe("FlowEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = true;
    mocks.update.mockResolvedValue(flow);
    mocks.create.mockResolvedValue(flow);
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders and navigates all four step editors", async () => {
    const user = userEvent.setup();
    render(<FlowEditor initialFlow={flow} />);
    expect(screen.getByDisplayValue("Choose area")).toBeInTheDocument();

    await user.click(screen.getAllByText("Q1")[0]);
    expect(screen.getByDisplayValue("Is it accessible?")).toBeInTheDocument();
    expect(screen.getAllByText("Conditional YES Navigation").length).toBeGreaterThan(0);

    await user.click(screen.getAllByText("F1")[0]);
    expect(screen.getByDisplayValue("Record finding")).toBeInTheDocument();
    expect(screen.getByText("Shared Quantity")).toBeInTheDocument();

    await user.click(screen.getAllByText("E1")[0]);
    expect(screen.getByText("Editing step details")).toBeInTheDocument();
  });

  it("opens the help guide, filters steps and marks edits as unsaved", async () => {
    const user = userEvent.setup();
    render(<FlowEditor initialFlow={flow} />);
    await user.click(screen.getByTitle("How to create a flow"));
    expect(screen.getByRole("heading", { name: "How to Create a Flow" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Got it!" }));

    await user.type(screen.getByPlaceholderText("Search steps..."), "F1");
    expect(screen.getByPlaceholderText("Search steps...")).toHaveValue("F1");
    expect(screen.getAllByText("F1").length).toBeGreaterThan(0);

    const title = screen.getByDisplayValue("Accessibility flow");
    fireEvent.change(title, { target: { value: "Updated flow" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeEnabled();
  });

  it("validates, saves and calculates immutable shared quantity metadata", async () => {
    const user = userEvent.setup();
    render(<FlowEditor initialFlow={flow} />);
    await user.click(screen.getByRole("button", { name: "Save Flow" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    const [, saved] = mocks.update.mock.calls[0];
    const form = (saved as Flow).steps.find((step) => step.id === "F1");
    expect(form).toMatchObject({
      metadata: { sharedQuantity: { appliesToBarriers: ["BQ", "BS"] } },
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["flows", "detail", "flow-1"],
    });
    expect(screen.getByRole("heading", { name: "Flow Saved" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(mocks.push).toHaveBeenCalledWith("/flows");
  });

  it("shows validation errors and never persists an invalid flow", async () => {
    const user = userEvent.setup();
    render(<FlowEditor initialFlow={{ ...flow, title: "", steps: [] }} />);
    await user.click(screen.getByRole("button", { name: "Save Flow" }));
    expect(screen.getByRole("heading", { name: "Validation Error" })).toBeInTheDocument();
    expect(screen.getByText("Flow Title is required.")).toBeInTheDocument();
    expect(screen.getByText("Flow must have at least one step.")).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("prevents viewers from saving, discarding, deleting or adding steps", () => {
    mocks.isAdmin = false;
    render(<FlowEditor initialFlow={flow} />);
    expect(screen.getByRole("button", { name: "Save Flow" })).toBeDisabled();
    expect(screen.getAllByTitle("Only administrators can delete steps")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Question" })).toBeDisabled();
  });
});
