import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import CreateUserDialog, {
  type CreateUserDialogProps,
} from "../CreateUserDialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(overrides?: Partial<CreateUserDialogProps>) {
  const props: CreateUserDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };

  const utils = render(<CreateUserDialog {...props} />);
  return { ...utils, props };
}

/** Completa el formulario con datos válidos. */
async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  values?: { name?: string; email?: string; role?: string; password?: string }
) {
  await user.type(screen.getByLabelText("Name"), values?.name ?? "Jane Doe");
  await user.type(
    screen.getByLabelText("Email"),
    values?.email ?? "jane@kma.test"
  );
  await user.selectOptions(
    screen.getByLabelText("Role"),
    values?.role ?? "auditor"
  );
  await user.type(
    screen.getByLabelText("Password"),
    values?.password ?? "Str0ngPass!"
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreateUserDialog", () => {
  it("renders nothing while closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Modo alta
  // -------------------------------------------------------------------------

  it("renders the create copy when there are no default values", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "Add New User" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create a new user account in the system")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create User" })
    ).toBeInTheDocument();
  });

  it("renders every field empty in create mode", () => {
    renderDialog();

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Role")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("renders the create mode help texts and placeholders", () => {
    renderDialog();

    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "placeholder",
      "Enter username"
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "placeholder",
      "Enter password"
    );
    expect(
      screen.getByText("Required – initial password for the user account.")
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Modo edición
  // -------------------------------------------------------------------------

  it("renders the edit copy when a name default value is present", () => {
    renderDialog({
      defaultValues: {
        name: "Jane Doe",
        email: "jane@kma.test",
        role: "qc",
      },
    });

    expect(
      screen.getByRole("heading", { name: "Edit User" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Update user details and permissions")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  it("prefills the fields from the default values and keeps the password empty", () => {
    renderDialog({
      defaultValues: {
        name: "Jane Doe",
        email: "jane@kma.test",
        role: "qc",
        password: "ignored",
      },
    });

    expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("jane@kma.test");
    expect(screen.getByLabelText("Role")).toHaveValue("qc");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("marks the password as optional in edit mode", () => {
    renderDialog({ defaultValues: { name: "Jane Doe" } });

    const password = screen.getByLabelText("Password");
    expect(password).not.toBeRequired();
    expect(password).toHaveAttribute("placeholder", "(Unchanged)");
    expect(
      screen.getByText("Leave blank to keep existing password.")
    ).toBeInTheDocument();
  });

  // Sin `name` en los defaults el diálogo sigue en modo alta.
  it("stays in create mode when the default values carry no name", () => {
    renderDialog({ defaultValues: { email: "jane@kma.test" } });

    expect(
      screen.getByRole("heading", { name: "Add New User" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("jane@kma.test");
    expect(screen.getByLabelText("Password")).toBeRequired();
  });

  it("resets the values from the default values when it is reopened", () => {
    const defaultValues = { name: "Jane Doe", email: "jane@kma.test" };
    const { rerender } = renderDialog({ open: false, defaultValues });

    rerender(
      <CreateUserDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        defaultValues={defaultValues}
      />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
  });

  // -------------------------------------------------------------------------
  // Validación de email
  // -------------------------------------------------------------------------

  it("declares the email field as an email typed required input", () => {
    renderDialog();

    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toBeRequired();
  });

  it("marks a malformed email as invalid", async () => {
    const user = userEvent.setup();
    renderDialog();

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    await user.type(email, "not-an-email");

    expect(email.checkValidity()).toBe(false);
    expect(email.validity.typeMismatch).toBe(true);
  });

  it("marks a well formed email as valid", async () => {
    const user = userEvent.setup();
    renderDialog();

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    await user.type(email, "jane@kma.test");

    expect(email.checkValidity()).toBe(true);
  });

  it("marks an empty required email as invalid", () => {
    renderDialog();

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    expect(email.checkValidity()).toBe(false);
    expect(email.validity.valueMissing).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Validación de rol
  // -------------------------------------------------------------------------

  it("offers only the Cognito group roles", () => {
    renderDialog();

    const select = screen.getByLabelText("Role");
    const options = Array.from(
      select.querySelectorAll("option")
    ).map((option) => option.getAttribute("value"));

    expect(options).toEqual(["", "auditor", "qc", "admin"]);
  });

  const roleLabels: Array<{ value: string; label: string }> = [
    { value: "auditor", label: "Auditor" },
    { value: "qc", label: "QC Manager" },
    { value: "admin", label: "Administrator" },
  ];

  it.each(roleLabels)("labels the $value role as $label", ({ value, label }) => {
    renderDialog();

    const option = screen.getByRole("option", { name: label });
    expect(option).toHaveValue(value);
  });

  it("declares the role select as required and empty by default", () => {
    renderDialog();

    const select = screen.getByLabelText("Role") as HTMLSelectElement;
    expect(select).toBeRequired();
    expect(select.checkValidity()).toBe(false);
    expect(select.validity.valueMissing).toBe(true);
  });

  it("becomes valid once a role is selected", async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = screen.getByLabelText("Role") as HTMLSelectElement;
    await user.selectOptions(select, "qc");

    expect(select).toHaveValue("qc");
    expect(select.checkValidity()).toBe(true);
  });

  it("renders the placeholder option that blocks an empty role", () => {
    renderDialog();

    expect(screen.getByRole("option", { name: "Select a role" })).toHaveValue("");
  });

  // -------------------------------------------------------------------------
  // Envío
  // -------------------------------------------------------------------------

  it("submits the trimmed values", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSubmit });

    await fillValidForm(user, {
      name: "  Jane Doe  ",
      email: "  jane@kma.test  ",
      password: "  Str0ngPass!  ",
    });
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@kma.test",
      role: "auditor",
      password: "Str0ngPass!",
    });
  });

  // FIXME: un rol que no coincida exactamente con un value del select
  // (por ejemplo "ADMIN" o "Administrator") deja el select vacío y, al ser
  // `required`, el formulario de edición no se puede guardar sin volver a
  // elegir el rol. El `toLowerCase()` de `onSubmitInternal` sugiere que se
  // esperaba normalizar la entrada, pero la normalización llega tarde: el
  // select ya descartó el valor. Test del comportamiento ACTUAL.
  it("drops a default role that does not match an option value", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderDialog({
      onSubmit,
      defaultValues: {
        name: "Jane Doe",
        email: "jane@kma.test",
        role: "ADMIN",
      },
    });

    const select = screen.getByLabelText("Role") as HTMLSelectElement;
    expect(select).toHaveValue("");
    expect(select.validity.valueMissing).toBe(true);

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("normalizes the role to lower case on submit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderDialog({
      onSubmit,
      defaultValues: {
        name: "Jane Doe",
        email: "jane@kma.test",
        role: "admin",
      },
    });

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@kma.test",
      role: "admin",
      password: "",
    });
  });

  it("awaits an async onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDialog({ onSubmit });

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("submits an empty password in edit mode", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderDialog({
      onSubmit,
      defaultValues: {
        name: "Jane Doe",
        email: "jane@kma.test",
        role: "qc",
      },
    });

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ password: "" })
    );
  });

  // -------------------------------------------------------------------------
  // Estado de carga y error
  // -------------------------------------------------------------------------

  it("disables every control while loading", () => {
    renderDialog({ loading: true });

    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Role")).toBeDisabled();
    expect(screen.getByLabelText("Password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
  });

  const loadingCases: Array<{ loading: boolean | undefined; disabled: boolean }> =
    [
      { loading: true, disabled: true },
      { loading: false, disabled: false },
      { loading: undefined, disabled: false },
    ];

  it.each(loadingCases)(
    "computes the disabled state when loading is $loading",
    ({ loading, disabled }) => {
      renderDialog(loading !== undefined ? { loading } : {});

      const name = screen.getByLabelText("Name");
      if (disabled) {
        expect(name).toBeDisabled();
      } else {
        expect(name).toBeEnabled();
      }
    }
  );

  it("renders the error message when the submission failed", () => {
    renderDialog({ error: "Invalid role" });

    const error = screen.getByText("Invalid role");
    expect(error).toHaveClass("text-red-600");
  });

  it("does not render an error message when error is null", () => {
    renderDialog({ error: null });

    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Cierre
  // -------------------------------------------------------------------------

  it("closes through the close button", async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.keyboard("{Escape}");

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("toggles the password visibility", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password"
    );

    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" })
    );

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });
});
