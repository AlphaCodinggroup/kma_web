import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CreateProjectDialog from "./CreateProjectDialog";
import EditProjectDialog from "./EditProjectDialog";
import ProjectUpsertDialog from "./ProjectsUpsertDialog";
import CreateFacilityDialog from "../../facilities/ui/CreateFacilityDialog";
import EditFacilityDialog from "../../facilities/ui/EditFacilityDialog";

const auditors = [
  { id: "u-name", cognitoId: "c1", name: " Alice ", email: "alice@example.com", role: "auditor" },
  { id: "u-email", cognitoId: "c2", name: "", email: "fallback@example.com", role: "auditor" },
  { id: "u-id", cognitoId: "c3", name: "", email: "", role: "auditor" },
];
const facilities = [
  { id: "f-name", name: "Main Site" },
  { id: "f-id", name: "" },
];

describe("project upsert dialogs", () => {
  afterEach(cleanup);

  it("keeps an invalid create form disabled and shows validation after touch", async () => {
    const user = userEvent.setup();
    render(
      <CreateProjectDialog
        open
        onOpenChange={vi.fn()}
        auditors={auditors}
        facilities={facilities}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Create New Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Project" })).toBeDisabled();
    await user.type(screen.getByLabelText("Project Name"), "   ");
    await user.tab();
    expect(screen.getByText("Project name is required.")).toBeInTheDocument();
  });

  it("normalizes project data, deduplicates selections and supports removal", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ProjectUpsertDialog
        mode="create"
        open
        onOpenChange={vi.fn()}
        auditors={auditors}
        facilities={facilities}
        onSubmit={onSubmit}
        titleOverride="Custom project"
        descriptionOverride="Custom description"
        submitLabelOverride="Save custom"
      />
    );

    expect(screen.getByRole("heading", { name: "Custom project" })).toBeInTheDocument();
    expect(screen.getByText("Custom description")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Project Name"), "  Safety review  ");
    await user.selectOptions(screen.getByLabelText("Select an auditor to add"), "u-name");
    await user.selectOptions(screen.getByLabelText("Select an auditor to add"), "u-name");
    expect(screen.getAllByRole("button", { name: "Remove Alice" })).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText("Select an auditor to add"), "u-email");
    await user.selectOptions(screen.getByLabelText("Select an auditor to add"), "u-id");
    await user.selectOptions(screen.getByLabelText("Select a facility to add"), "f-name");
    await user.selectOptions(screen.getByLabelText("Select a facility to add"), "f-id");

    await user.click(screen.getByRole("button", { name: "Remove fallback@example.com" }));
    await user.click(screen.getByRole("button", { name: "Remove f-id" }));
    await user.click(screen.getByRole("button", { name: "Save custom" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Safety review",
      auditorIds: ["u-name", "u-id"],
      facilityIds: ["f-name"],
    });
  });

  it("maps edit defaults, trims description and appends the project id", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <EditProjectDialog
        open
        onOpenChange={vi.fn()}
        project={{
          id: "project-1",
          name: " Existing ",
          description: " Old description ",
          users: [{ id: "u-name", name: "Alice" }],
          facilities: [{ id: "f-name", name: "Main" }, { id: "", name: "Invalid" }],
        } as any}
        auditors={auditors}
        facilities={facilities}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit Project" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Project Name"));
    await user.type(screen.getByLabelText("Project Name"), " Updated ");
    await user.click(screen.getByRole("button", { name: "Update Project" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      id: "project-1",
      name: "Updated",
      description: "Old description",
      auditorIds: ["u-name"],
      facilityIds: ["f-name"],
    }));
  });

  it("shows errors, disables controls while loading and closes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ProjectUpsertDialog
        mode="edit"
        open
        onOpenChange={onOpenChange}
        defaultValues={{ name: "Project", auditorIds: ["unknown"], facilityIds: ["unknown"] }}
        auditors={[]}
        facilities={[]}
        onSubmit={vi.fn()}
        loading
        error="Version conflict"
      />
    );

    expect(screen.getByText("Version conflict")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Remove unknown" });
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons.every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("facility upsert dialogs", () => {
  const createObjectURL = vi.fn(() => "blob:preview");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("requires name, address and city and submits normalized optional values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <CreateFacilityDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        titleOverride="New location"
        descriptionOverride="Required location data"
        submitLabelOverride="Save location"
      />
    );

    expect(screen.getByText("Required location data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save location" })).toBeDisabled();
    await user.type(screen.getByLabelText("Name"), "  Warehouse  ");
    await user.type(screen.getByLabelText("Address"), "  One Street  ");
    await user.type(screen.getByLabelText("City, State"), "  Boston, MA  ");
    await user.type(screen.getByLabelText("Description"), "  Storage  ");
    await user.click(screen.getByRole("button", { name: "Save location" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Warehouse",
      address: "One Street",
      city: "Boston, MA",
      description: "Storage",
    });
  });

  it("keeps, clears and replaces an existing photo deterministically", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender, unmount } = render(
      <EditFacilityDialog
        open
        onOpenChange={vi.fn()}
        defaultValues={{ name: "Site", address: "Road", city: "Town", photoUrl: " https://images/original " }}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByAltText("Facility photo preview")).toHaveAttribute("src", " https://images/original ");
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Update Facility" }));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ clearPhoto: true }));

    const file = new File(["image"], "facility.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Photo"), file);
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByAltText("Facility photo preview")).toHaveAttribute("src", "blob:preview");
    await user.click(screen.getByRole("button", { name: "Update Facility" }));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ photoFile: file }));

    fireEvent.change(screen.getByLabelText("Photo"), { target: { files: [] } });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    rerender(
      <EditFacilityDialog
        open={false}
        onOpenChange={vi.fn()}
        defaultValues={{ name: "Site", address: "Road", city: "Town" }}
        onSubmit={onSubmit}
      />
    );
    unmount();
  });

  it("resets object URLs on reopen and exposes loading and server errors", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <CreateFacilityDialog
        open
        onOpenChange={onOpenChange}
        defaultValues={{ name: "Site", address: "Road", city: "Town" }}
        onSubmit={vi.fn()}
      />
    );
    const file = new File(["image"], "facility.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Photo"), file);

    rerender(
      <CreateFacilityDialog
        open={false}
        onOpenChange={onOpenChange}
        defaultValues={{ name: "Site", address: "Road", city: "Town" }}
        onSubmit={vi.fn()}
      />
    );
    rerender(
      <CreateFacilityDialog
        open
        onOpenChange={onOpenChange}
        defaultValues={{ name: "New", address: "A", city: "B" }}
        onSubmit={vi.fn()}
        loading
        error="Upload failed"
      />
    );

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
