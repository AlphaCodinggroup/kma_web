import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProjectUpsertDialog from "../ProjectsUpsertDialog";
import FacilityUpsertDialog from "@features/facilities/ui/FacilityUpsertDialog";
import CreateUserDialog from "@features/users/ui/CreateUserDialog";

describe("management forms", () => {
  it.each(["project", "facility", "user"])("ignores a repeated submit while %s is pending", (type) => {
    const onSubmit = vi.fn();
    const common = { open: true, onOpenChange: vi.fn(), onSubmit, loading: true };
    if (type === "project") render(<ProjectUpsertDialog {...common} mode="create" auditors={[]} facilities={[]} defaultValues={{ name: "North" }} />);
    else if (type === "facility") render(<FacilityUpsertDialog {...common} mode="create" defaultValues={{ name: "North", city: "Boston", address: "Main St" }} />);
    else render(<CreateUserDialog {...common} />);
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps facility edits when equivalent defaults are returned after a failure", async () => {
    const defaults = { name: "North", city: "Boston", address: "Main St" };
    const common = { open: true, mode: "edit" as const, onOpenChange: vi.fn(), onSubmit: vi.fn() };
    const { rerender } = render(<FacilityUpsertDialog {...common} defaultValues={defaults} />);
    const name = screen.getByDisplayValue("North");
    await userEvent.type(name, " updated");
    rerender(<FacilityUpsertDialog {...common} defaultValues={{ ...defaults }} error="Save failed" />);
    expect(name).toHaveValue("North updated");
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });

  it("shows user errors beside the fields and focuses the first invalid input", async () => {
    const onSubmit = vi.fn();
    render(<CreateUserDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Name is required.");
    await userEvent.type(screen.getByLabelText("Name"), "Jane");
    await userEvent.type(screen.getByLabelText("Email"), "invalid-address");
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address.");
    expect(screen.getByLabelText("Name")).toHaveValue("Jane");
  });

  it.each(["ops@localhost", "jane@kma.test"])("accepts the address %s like the browser email field", (email) => {
    const onSubmit = vi.fn();
    render(<CreateUserDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} defaultValues={{ name: "Jane", email, role: "qc" }} />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "s3cret-pass" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email }));
  });

  it("focuses the missing facility address and retains the valid name", () => {
    const onSubmit = vi.fn();
    render(<FacilityUpsertDialog open mode="create" onOpenChange={vi.fn()} onSubmit={onSubmit} defaultValues={{ name: "North", city: "Boston" }} />);
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Address")).toHaveFocus();
    expect(screen.getByLabelText("Address")).toHaveAccessibleDescription("Address is required.");
    expect(screen.getByLabelText("Name")).toHaveValue("North");
  });

  it("blocks a second user submit before the parent pending state updates", async () => {
    let complete!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    render(<CreateUserDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} defaultValues={{ name: "Jane", email: "jane@kma.test", role: "qc" }} />);
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    complete();
  });
});
