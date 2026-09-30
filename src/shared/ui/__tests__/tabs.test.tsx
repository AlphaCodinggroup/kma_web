import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";

// Árbol de tabs reutilizable: dos triggers y dos paneles.
function renderTabs(props?: {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disableSecond?: boolean;
}) {
  return render(
    <Tabs
      defaultValue={props?.defaultValue ?? "overview"}
      {...(props?.onValueChange !== undefined
        ? { onValueChange: props.onValueChange }
        : {})}
    >
      <TabsList aria-label="Sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details" {...(props?.disableSecond ? { disabled: true } : {})}>
          Details
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="details">Details panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders the tablist with its triggers", () => {
    renderTabs();

    expect(screen.getByRole("tablist", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Details" })).toBeInTheDocument();
  });

  it("shows only the panel of the default value", () => {
    renderTabs();

    expect(screen.getByText("Overview panel")).toBeInTheDocument();
    expect(screen.queryByText("Details panel")).not.toBeInTheDocument();
  });

  it("marks the default trigger as selected", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("switches the visible panel when another trigger is clicked", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("tab", { name: "Details" }));

    expect(screen.getByText("Details panel")).toBeInTheDocument();
    expect(screen.queryByText("Overview panel")).not.toBeInTheDocument();
  });

  it("notifies onValueChange with the selected value", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderTabs({ onValueChange });

    await user.click(screen.getByRole("tab", { name: "Details" }));

    expect(onValueChange).toHaveBeenCalledWith("details");
  });

  it("does not activate a disabled trigger", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderTabs({ onValueChange, disableSecond: true });

    const disabledTrigger = screen.getByRole("tab", { name: "Details" });
    expect(disabledTrigger).toBeDisabled();

    await user.click(disabledTrigger);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByText("Overview panel")).toBeInTheDocument();
  });

  it("applies the base classes on the list", () => {
    renderTabs();
    expect(screen.getByRole("tablist")).toHaveClass(
      "inline-flex",
      "h-10",
      "items-center",
      "rounded-xl",
      "bg-gray-100",
      "shadow-sm"
    );
  });

  it("applies the base classes on the triggers", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveClass(
      "inline-flex",
      "rounded-xl",
      "px-4",
      "py-2",
      "text-sm",
      "font-semibold"
    );
  });

  it("applies the base classes on the visible content", () => {
    renderTabs();
    expect(screen.getByRole("tabpanel")).toHaveClass("mt-4");
  });

  it("merges custom classNames on list, trigger and content", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="list-extra">
          <TabsTrigger value="a" className="trigger-extra">
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="content-extra">
          A panel
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByRole("tablist")).toHaveClass("list-extra", "inline-flex");
    expect(screen.getByRole("tab", { name: "A" })).toHaveClass(
      "trigger-extra",
      "inline-flex"
    );
    expect(screen.getByRole("tabpanel")).toHaveClass("content-extra", "mt-4");
  });

  it("forwards extra props such as data attributes and id", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList data-testid="list" id="list-id">
          <TabsTrigger value="a" data-testid="trigger">
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a" data-testid="content">
          A panel
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByTestId("list")).toHaveAttribute("id", "list-id");
    expect(screen.getByTestId("trigger")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("forwards refs on list, trigger and content", () => {
    const listRef = React.createRef<HTMLDivElement>();
    const triggerRef = React.createRef<HTMLButtonElement>();
    const contentRef = React.createRef<HTMLDivElement>();

    render(
      <Tabs defaultValue="a">
        <TabsList ref={listRef}>
          <TabsTrigger value="a" ref={triggerRef}>
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a" ref={contentRef}>
          A panel
        </TabsContent>
      </Tabs>
    );

    expect(listRef.current).toBeInstanceOf(HTMLDivElement);
    expect(triggerRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(contentRef.current).toBeInstanceOf(HTMLDivElement);
  });

  it("supports the controlled mode through value", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = React.useState("overview");
      return (
        <Tabs value={value} onValueChange={setValue}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview panel</TabsContent>
          <TabsContent value="details">Details panel</TabsContent>
        </Tabs>
      );
    }

    render(<Controlled />);
    await user.click(screen.getByRole("tab", { name: "Details" }));

    expect(screen.getByText("Details panel")).toBeInTheDocument();
  });

  it("exposes the radix displayNames", () => {
    expect(TabsList.displayName).toBeTruthy();
    expect(TabsTrigger.displayName).toBeTruthy();
    expect(TabsContent.displayName).toBeTruthy();
  });
});
