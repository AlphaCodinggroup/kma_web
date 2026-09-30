import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  Label,
  Input,
  Textarea,
  Button,
  HelpText,
  ErrorText,
} from "../controls";

describe("Label", () => {
  it("renders a label element with its base classes", () => {
    render(<Label>My label</Label>);
    const label = screen.getByText("My label");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("block", "text-sm", "font-medium", "text-black", "mb-1");
  });

  it("associates itself with a control through htmlFor", () => {
    render(
      <>
        <Label htmlFor="my-field">Field</Label>
        <input id="my-field" />
      </>
    );
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
  });

  // Comportamiento actual documentado: `Label` no exige `htmlFor` ni envuelve
  // al control, por lo que un uso sin `htmlFor` produce un `label` huérfano.
  // Es el warning conocido de accesibilidad de controls.tsx
  // (jsx-a11y/label-has-associated-control, controls.tsx:10). No se corrige
  // acá: el test sólo fija el comportamiento vigente.
  it("renders an orphan label when no control is associated (known a11y warning)", () => {
    render(<Label>Orphan</Label>);
    const label = screen.getByText("Orphan");
    expect(label).not.toHaveAttribute("for");
    expect(label.children).toHaveLength(0);
  });

  it("merges a custom className", () => {
    render(<Label className="label-extra">Custom</Label>);
    expect(screen.getByText("Custom")).toHaveClass("label-extra", "block");
  });

  it("forwards its ref", () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Ref label</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it("exposes a displayName", () => {
    expect(Label.displayName).toBe("Label");
  });
});

describe("Input", () => {
  it("renders a plain input with the base classes", () => {
    render(<Input aria-label="Plain input" />);
    const input = screen.getByLabelText("Plain input");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveClass("w-full", "rounded-xl", "bg-gray-100", "text-black");
  });

  it("renders with the minimum props and no explicit type", () => {
    const { container } = render(<Input />);
    expect(container.querySelector("input")).toBeInTheDocument();
  });

  const errorCases: Array<{ error: boolean | undefined; shouldHave: boolean }> = [
    { error: true, shouldHave: true },
    { error: false, shouldHave: false },
    { error: undefined, shouldHave: false },
  ];

  it.each(errorCases)(
    "applies the error ring when error is $error",
    ({ error, shouldHave }) => {
      render(
        <Input
          aria-label="Errored"
          {...(error !== undefined ? { error } : {})}
        />
      );
      const input = screen.getByLabelText("Errored");
      if (shouldHave) {
        expect(input).toHaveClass("ring-red-400");
      } else {
        expect(input).not.toHaveClass("ring-red-400");
      }
    }
  );

  it("renders in the disabled state", () => {
    render(<Input aria-label="Disabled input" disabled />);
    expect(screen.getByLabelText("Disabled input")).toBeDisabled();
  });

  it("merges a custom className", () => {
    render(<Input aria-label="Classy" className="input-extra" />);
    expect(screen.getByLabelText("Classy")).toHaveClass("input-extra", "w-full");
  });

  it("forwards extra props such as placeholder and name", () => {
    render(<Input aria-label="Extras" placeholder="Type here" name="field-name" />);
    const input = screen.getByLabelText("Extras");
    expect(input).toHaveAttribute("placeholder", "Type here");
    expect(input).toHaveAttribute("name", "field-name");
  });

  it("forwards its ref", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Ref input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("calls onChange while typing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input aria-label="Typed" onChange={onChange} />);

    await user.type(screen.getByLabelText("Typed"), "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText("Typed")).toHaveValue("abc");
  });

  it("does not render the toggle for a password input without withPasswordToggle", () => {
    render(<Input aria-label="Secret" type="password" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render the toggle for a non password input with withPasswordToggle", () => {
    render(<Input aria-label="Text" type="text" withPasswordToggle />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the default password toggle and switches visibility", async () => {
    const user = userEvent.setup();
    render(
      <Input aria-label="Password" id="pwd" type="password" withPasswordToggle />
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveClass("pr-10");

    const toggle = screen.getByRole("button", { name: "Mostrar contraseña" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-controls", "pwd");

    await user.click(toggle);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    const hideToggle = screen.getByRole("button", { name: "Ocultar contraseña" });
    expect(hideToggle).toHaveAttribute("aria-pressed", "true");

    await user.click(hideToggle);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("uses a custom renderToggle and passes visible, toggle and inputId", async () => {
    const user = userEvent.setup();
    render(
      <Input
        aria-label="Custom toggle"
        id="custom-pwd"
        type="password"
        withPasswordToggle
        renderToggle={({ visible, toggle, inputId }) => (
          <button type="button" onClick={toggle} data-input-id={inputId}>
            {visible ? "hide" : "show"}
          </button>
        )}
      />
    );

    const toggle = screen.getByRole("button", { name: "show" });
    expect(toggle).toHaveAttribute("data-input-id", "custom-pwd");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "hide" })).toBeInTheDocument();
  });

  it("passes an empty inputId to renderToggle when the input has no id", () => {
    render(
      <Input
        aria-label="No id"
        type="password"
        withPasswordToggle
        renderToggle={({ inputId }) => (
          <span data-testid="toggle-id">{`[${inputId}]`}</span>
        )}
      />
    );
    expect(screen.getByTestId("toggle-id")).toHaveTextContent("[]");
  });

  it("exposes a displayName", () => {
    expect(Input.displayName).toBe("Input");
  });
});

describe("Textarea", () => {
  it("renders a textarea with the base classes", () => {
    render(<Textarea aria-label="Notes" />);
    const textarea = screen.getByLabelText("Notes");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveClass("w-full", "rounded-xl", "bg-gray-100");
  });

  it("renders with the minimum props", () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector("textarea")).toBeInTheDocument();
  });

  const textareaErrorCases: Array<{ error: boolean | undefined; shouldHave: boolean }> =
    [
      { error: true, shouldHave: true },
      { error: false, shouldHave: false },
      { error: undefined, shouldHave: false },
    ];

  it.each(textareaErrorCases)(
    "applies the error ring when error is $error",
    ({ error, shouldHave }) => {
      render(
        <Textarea
          aria-label="Errored area"
          {...(error !== undefined ? { error } : {})}
        />
      );
      const textarea = screen.getByLabelText("Errored area");
      if (shouldHave) {
        expect(textarea).toHaveClass("ring-red-400");
      } else {
        expect(textarea).not.toHaveClass("ring-red-400");
      }
    }
  );

  it("renders in the disabled state", () => {
    render(<Textarea aria-label="Disabled area" disabled />);
    expect(screen.getByLabelText("Disabled area")).toBeDisabled();
  });

  it("merges a custom className and forwards extra props", () => {
    render(
      <Textarea
        aria-label="Extras area"
        className="area-extra"
        rows={7}
        placeholder="Write"
      />
    );
    const textarea = screen.getByLabelText("Extras area");
    expect(textarea).toHaveClass("area-extra");
    expect(textarea).toHaveAttribute("rows", "7");
    expect(textarea).toHaveAttribute("placeholder", "Write");
  });

  it("calls onChange while typing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Textarea aria-label="Typed area" onChange={onChange} />);

    await user.type(screen.getByLabelText("Typed area"), "hi");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("forwards its ref", () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} aria-label="Ref area" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("exposes a displayName", () => {
    expect(Textarea.displayName).toBe("Textarea");
  });
});

describe("Button", () => {
  it("renders its children and the base classes", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("inline-flex", "rounded-xl", "bg-black", "text-white");
    expect(button).toBeEnabled();
  });

  it("renders the loading label and disables itself when isLoading is true", () => {
    render(<Button isLoading>Save</Button>);
    const button = screen.getByRole("button", { name: "Loading..." });
    expect(button).toBeDisabled();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  const disabledCases: Array<{
    label: string;
    props: { disabled?: boolean; isLoading?: boolean };
    expectDisabled: boolean;
  }> = [
    { label: "no flags", props: {}, expectDisabled: false },
    { label: "disabled only", props: { disabled: true }, expectDisabled: true },
    { label: "isLoading only", props: { isLoading: true }, expectDisabled: true },
    {
      label: "both flags",
      props: { disabled: true, isLoading: true },
      expectDisabled: true,
    },
  ];

  it.each(disabledCases)(
    "computes the disabled state with $label",
    ({ props, expectDisabled }) => {
      render(<Button {...props}>Action</Button>);
      const button = screen.getByRole("button");
      if (expectDisabled) {
        expect(button).toBeDisabled();
      } else {
        expect(button).toBeEnabled();
      }
    }
  );

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole("button", { name: "Click me" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick while disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>
    );

    await user.click(screen.getByRole("button", { name: "Click me" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges a custom className and forwards extra props", () => {
    render(
      <Button className="btn-extra" type="submit" data-testid="btn">
        Submit
      </Button>
    );
    const button = screen.getByTestId("btn");
    expect(button).toHaveClass("btn-extra", "bg-black");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("forwards its ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("exposes a displayName", () => {
    expect(Button.displayName).toBe("Button");
  });
});

describe("HelpText and ErrorText", () => {
  const paragraphs: Array<{
    name: string;
    Component: React.ElementType;
    baseClasses: string[];
  }> = [
    { name: "HelpText", Component: HelpText, baseClasses: ["mt-1", "text-xs", "text-gray-600"] },
    { name: "ErrorText", Component: ErrorText, baseClasses: ["mt-2", "text-sm", "text-red-600"] },
  ];

  it.each(paragraphs)("$name renders a p with its base classes", ({ Component, baseClasses }) => {
    render(<Component>Message</Component>);
    const node = screen.getByText("Message");
    expect(node.tagName).toBe("P");
    expect(node).toHaveClass(...baseClasses);
  });

  it.each(paragraphs)("$name merges a custom className and forwards props", ({ Component }) => {
    render(
      <Component className="text-extra" data-testid="paragraph" id="p-id">
        Message
      </Component>
    );
    const node = screen.getByTestId("paragraph");
    expect(node).toHaveClass("text-extra");
    expect(node).toHaveAttribute("id", "p-id");
  });
});
